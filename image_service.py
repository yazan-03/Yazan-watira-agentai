"""Image/OCR task: inspect first, extract text only when needed, reuse RAG."""

import base64
import io
import json
import os
from pathlib import Path
import warnings

from dotenv import load_dotenv
from openai import AzureOpenAI, OpenAIError
from PIL import Image, ImageOps, UnidentifiedImageError

from prompts import (
    IMAGE_ROUTING_PROMPT, IMAGE_TEXT_PROMPT, IMAGE_GROUNDED_PROMPT,
    IMAGE_VERIFY_PROMPT
)
from quality_check import check_retrieval_quality
from tools import rag_search


load_dotenv()
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MAX_QUESTION_LENGTH = 2000
SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}


class ImageValidationError(ValueError):
    """Invalid upload; can be safely explained to the user."""


class ImageProcessingError(RuntimeError):
    """An upstream model returned an invalid or incomplete response."""


def _get_client():
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    key = os.getenv("AZURE_OPENAI_KEY")
    if not endpoint or not key:
        raise ImageProcessingError("Azure OpenAI is not configured.")
    return AzureOpenAI(
        api_key=key, azure_endpoint=endpoint,
        api_version="2024-02-01", timeout=60, max_retries=1
    )


def encode_image(image_path):
    """Validate actual image bytes, honor EXIF orientation, normalize to PNG."""
    path = Path(image_path)
    if not path.is_file() or not 0 < path.stat().st_size <= MAX_IMAGE_BYTES:
        raise ImageValidationError("Upload an image smaller than 10 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(path) as image:
                if image.format not in SUPPORTED_FORMATS:
                    raise ImageValidationError("Supported images: JPEG, PNG, WEBP and static GIF.")
                if getattr(image, "n_frames", 1) != 1:
                    raise ImageValidationError("Animated images are not supported. Upload a single frame.")
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise ImageValidationError("Image resolution exceeds 40 megapixels.")
                image.load()
                image = ImageOps.exif_transpose(image)
                # Keep document lettering legible without sending huge scans.
                image.thumbnail((4096, 4096), Image.Resampling.LANCZOS)
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGBA" if "transparency" in image.info else "RGB")
                normalized = io.BytesIO()
                image.save(normalized, format="PNG")
                image_format = "png"
                if normalized.tell() > MAX_IMAGE_BYTES:
                    # A small JPEG upload can expand to tens of MB as PNG.
                    # Preserve small document images losslessly, but bound
                    # the actual payload sent to the vision service as well.
                    if image.mode == "RGBA":
                        flattened = Image.new("RGB", image.size, "white")
                        flattened.paste(image, mask=image.getchannel("A"))
                        image = flattened
                    else:
                        image = image.convert("RGB")
                    image_format = "jpeg"
                    while True:
                        normalized = io.BytesIO()
                        image.save(normalized, format="JPEG", quality=90)
                        if normalized.tell() <= MAX_IMAGE_BYTES:
                            break
                        image.thumbnail((max(1, int(image.width * 0.85)),
                                         max(1, int(image.height * 0.85))),
                                        Image.Resampling.LANCZOS)
    except ImageValidationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError,
            Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise ImageValidationError("The upload is not a readable supported image.") from error
    encoded = base64.b64encode(normalized.getvalue()).decode("ascii")
    return f"data:image/{image_format};base64,{encoded}"


def _request_json(system_prompt, payload, image_data=None):
    content = [{"type": "text", "text": json.dumps(payload, ensure_ascii=False)}]
    if image_data:
        content.append({
            "type": "image_url",
            "image_url": {"url": image_data, "detail": "high"}
        })
    deployment = (os.getenv("AZURE_OPENAI_VISION_DEPLOYMENT") or
                  os.getenv("AZURE_OPENAI_DEPLOYMENT"))
    if not deployment:
        raise ImageProcessingError("Set a vision-capable Azure OpenAI deployment.")
    try:
        response = _get_client().chat.completions.create(
            model=deployment,
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": content}],
            response_format={"type": "json_object"},
            max_completion_tokens=4000
        )
        choice = response.choices[0]
        if choice.finish_reason != "stop":
            raise ImageProcessingError("Image analysis was incomplete. Try a clearer or smaller image.")
        result = json.loads(choice.message.content or "")
        if not isinstance(result, dict):
            raise ValueError("Expected an object")
        return result
    except (json.JSONDecodeError, ValueError, IndexError, TypeError) as error:
        raise ImageProcessingError("Image analysis returned an invalid response. Please retry.") from error
    except OpenAIError as error:
        raise ImageProcessingError(
            "Azure image analysis failed. Check access to the vision deployment and retry."
        ) from error


def _inspect_image(image_data, question):
    decision = _request_json(IMAGE_ROUTING_PROMPT, {"question": question}, image_data)
    if (decision.get("mode") not in {"VISUAL", "OCR", "BOTH"} or
            type(decision.get("has_text")) is not bool or
            type(decision.get("visual_required")) is not bool or
            type(decision.get("text_required")) is not bool or
            type(decision.get("needs_rag")) is not bool or
            decision.get("response_language") not in {"ar", "en"} or
            not isinstance(decision.get("reason"), str)):
        raise ImageProcessingError("Image routing returned an invalid decision. Please retry.")
    if decision["needs_rag"] and not isinstance(decision.get("rag_query"), str):
        raise ImageProcessingError("Image routing did not provide a knowledge-base query.")
    # A detected absence of text must never trigger the OCR stage.
    text_required = decision["has_text"] and decision["text_required"]
    decision["mode"] = (
        "BOTH" if text_required and decision["visual_required"]
        else "OCR" if text_required else "VISUAL"
    )
    return decision


def decide_image_mode(image_path, question):
    """Compatibility helper; the main pipeline also exposes the routing reason."""
    return _inspect_image(encode_image(image_path), question)["mode"]


def _extract_text(image_data):
    result = _request_json(IMAGE_TEXT_PROMPT, {}, image_data)
    if (not isinstance(result.get("text"), str) or
            type(result.get("has_unreadable_text")) is not bool):
        raise ImageProcessingError("OCR returned an invalid response. Please retry.")
    return result


def extract_text(image_path):
    return _extract_text(encode_image(image_path))["text"]


def _not_found(language):
    return (
        "لا أستطيع العثور على المعلومة المطلوبة في الصورة أو النص المقروء منها."
        if language == "ar" else
        "I could not find the requested information in the image or its readable text."
    )


def process_image_question(image_path, question):
    """Return visual/OCR evidence and only grounded answers in the question's language."""
    if not isinstance(question, str) or not question.strip():
        raise ImageValidationError("Please enter a question about the image.")
    question = question.strip()
    if len(question) > MAX_QUESTION_LENGTH:
        raise ImageValidationError("The question must be at most 2000 characters.")
    image_data = encode_image(image_path)
    decision = _inspect_image(image_data, question)
    language = decision["response_language"]
    ocr_required = decision["has_text"] and decision["mode"] in {"OCR", "BOTH"}
    ocr_text = None
    notes = []
    if ocr_required:
        ocr = _extract_text(image_data)
        ocr_text = ocr["text"]
        if ocr["has_unreadable_text"] or "[UNREADABLE]" in ocr_text:
            notes.append(
                "بعض النص غير واضح؛ أعد رفع صورة أوضح لقراءة دقيقة."
                if language == "ar" else
                "Some text is unreadable. Upload a clearer image for an accurate reading."
            )

    chunks = []
    retrieval_quality = None
    rag_used = decision["needs_rag"]
    if rag_used:
        query = decision["rag_query"].strip()[:MAX_QUESTION_LENGTH]
        if not query:
            raise ImageProcessingError("An empty knowledge-base query was returned.")
        try:
            candidates = rag_search(query)
            retrieval_quality = check_retrieval_quality(query, candidates)
            if retrieval_quality.get("sufficient") is True:
                chunks = candidates
        except Exception:
            retrieval_quality = {"sufficient": False, "reason": "Knowledge-base retrieval failed."}
        if not chunks:
            notes.append(
                "لم أجد دليلًا كافيًا في قاعدة المعرفة للإجابة عن الجزء المرتبط بها."
                if language == "ar" else
                "The knowledge base did not provide sufficient evidence for that part of the question."
            )

    context = [{"index": index, "source": chunk.get("source"),
                "content": chunk.get("content", "")}
               for index, chunk in enumerate(chunks, start=1)]
    answer = _request_json(
        IMAGE_GROUNDED_PROMPT,
        {"question": question, "response_language": language,
         "mode": decision["mode"], "ocr_text": ocr_text,
         "rag_requested": rag_used, "knowledge_base": context},
        # OCR answers are constrained to extracted text; visual/BOTH can
        # additionally use the actual image as evidence.
        image_data if decision["mode"] != "OCR" else None
    )
    if (answer.get("status") not in {"supported", "partial", "unavailable"} or
            not isinstance(answer.get("answer"), str) or
            not isinstance(answer.get("used_chunk_indexes"), list)):
        raise ImageProcessingError("The answer failed the grounding response format. Please retry.")
    valid_indexes = {
        index for index in answer["used_chunk_indexes"]
        if type(index) is int and 1 <= index <= len(chunks)
    }
    status = answer["status"]
    final_answer = answer["answer"].strip()
    if rag_used and status == "supported" and not valid_indexes:
        status = "partial" if final_answer else "unavailable"
        final_answer = "\n".join([final_answer, *notes]).strip()
    if status == "unavailable" or not final_answer:
        status = "unavailable"
        final_answer = _not_found(language)
        if rag_used and notes:
            final_answer += " " + notes[-1]
        valid_indexes = set()
    sources = list(dict.fromkeys(
        chunks[index - 1]["source"] for index in sorted(valid_indexes)
        if chunks[index - 1].get("source")
    ))
    if status != "unavailable":
        verification = _request_json(
            IMAGE_VERIFY_PROMPT,
            {"question": question, "mode": decision["mode"],
             "response_language": language,
             "ocr_text": ocr_text, "rag_requested": rag_used,
             "knowledge_base": [chunk for chunk in context
                                if chunk["index"] in valid_indexes],
             "candidate_answer": final_answer},
            image_data if decision["mode"] != "OCR" else None
        )
        if verification.get("grounded") is not True:
            status = "unavailable"
            final_answer = _not_found(language)
            sources = []
            notes.append(
                "تعذر التحقق من أن الإجابة مدعومة بالأدلة المتاحة."
                if language == "ar" else
                "The proposed answer could not be verified against the available evidence."
            )
    return {
        "answer": final_answer, "mode": decision["mode"],
        "has_text": decision["has_text"], "ocr_required": ocr_required,
        "ocr_text": ocr_text, "decision_reason": decision["reason"],
        "rag_used": rag_used, "sources": sources, "warnings": notes,
        "status": status, "language": language,
        "retrieval_quality": retrieval_quality
    }
