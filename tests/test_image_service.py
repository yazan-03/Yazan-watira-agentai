r"""Offline regressions for the image/OCR pipeline and its Flask boundary.

Run with: venv\Scripts\python.exe -m unittest discover -s tests -v
Model and search calls are mocked; these tests never contact Azure.
"""

import base64
import io
import os
from pathlib import Path
import random
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image


# The shared RAG modules construct clients at import time. Dummy settings allow
# offline tests to run even in a checkout without a private .env file.
for setting, value in {
    "AZURE_OPENAI_ENDPOINT": "https://unit-test.openai.azure.com",
    "AZURE_OPENAI_KEY": "offline-test-key",
    "AZURE_OPENAI_DEPLOYMENT": "offline-test-deployment",
    "AZURE_SEARCH_ENDPOINT": "https://unit-test.search.windows.net",
    "AZURE_SEARCH_KEY": "offline-test-key",
    "AZURE_SEARCH_INDEX": "offline-test-index",
}.items():
    os.environ.setdefault(setting, value)

import image_service
import prompts


class ImagePipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory(prefix="watira-image-tests-")
        self.addCleanup(self.temp_dir.cleanup)
        self.image_path = Path(self.temp_dir.name) / "example.png"
        Image.new("RGB", (32, 24), "red").save(self.image_path)
        self.calls = []

    def model_replies(self, *, route=None, text="", unreadable=False, answer=None,
                      verification=None):
        route = route or {
            "mode": "VISUAL", "has_text": False, "needs_rag": False,
            "visual_required": True, "text_required": False,
            "response_language": "en",
            "rag_query": None, "reason": "The question asks about a visible color."
        }
        answer = answer or {
            "status": "supported", "answer": "The object is red.",
            "used_chunk_indexes": []
        }

        def respond(system_prompt, payload, image_data=None):
            self.calls.append((system_prompt, payload, image_data))
            if system_prompt == prompts.IMAGE_ROUTING_PROMPT:
                return dict(route)
            if system_prompt == prompts.IMAGE_TEXT_PROMPT:
                return {"text": text, "has_unreadable_text": unreadable}
            if system_prompt == prompts.IMAGE_GROUNDED_PROMPT:
                return dict(answer)
            if system_prompt == prompts.IMAGE_VERIFY_PROMPT:
                return dict(verification if verification is not None else {
                    "grounded": True, "reason": "The supplied evidence supports the answer."
                })
            raise AssertionError("An unexpected model stage was invoked")

        return patch.object(image_service, "_request_json", side_effect=respond)

    def route(self, mode="OCR", has_text=True, needs_rag=False, language="en"):
        return {
            "mode": mode, "has_text": has_text, "needs_rag": needs_rag,
            "visual_required": mode in {"VISUAL", "BOTH"},
            "text_required": mode in {"OCR", "BOTH"},
            "response_language": language,
            "rag_query": "Moringa tea preparation instructions" if needs_rag else None,
            "reason": "Read the relevant label before answering."
        }

    def test_spoofed_png_extension_is_rejected_before_any_model_call(self):
        fake_image = Path(self.temp_dir.name) / "not-an-image.png"
        fake_image.write_bytes(b"This is plain text, despite its PNG extension.")
        with patch.object(image_service, "_request_json") as model:
            with self.assertRaises(image_service.ImageValidationError):
                image_service.process_image_question(fake_image, "What is shown?")
        model.assert_not_called()

    def test_actual_image_bytes_are_normalized_independent_of_extension(self):
        jpeg_path = Path(self.temp_dir.name) / "photo.image"
        Image.new("RGB", (12, 8), "blue").save(jpeg_path, format="JPEG")
        data_uri = image_service.encode_image(jpeg_path)
        self.assertTrue(data_uri.startswith("data:image/png;base64,"))
        with Image.open(io.BytesIO(base64.b64decode(data_uri.split(",", 1)[1]))) as image:
            self.assertEqual(image.format, "PNG")
            self.assertEqual(image.size, (12, 8))

    def test_normalization_limits_outbound_bytes_when_png_expands_compressed_upload(self):
        upload = Path(self.temp_dir.name) / "compressed-photo.jpg"
        pixels = random.Random(19).randbytes(1024 * 1024 * 3)
        Image.frombytes("RGB", (1024, 1024), pixels).save(upload, format="JPEG", quality=45)
        byte_limit = 512 * 1024
        self.assertLess(upload.stat().st_size, byte_limit)
        with patch.object(image_service, "MAX_IMAGE_BYTES", byte_limit):
            data_uri = image_service.encode_image(upload)
        normalized_bytes = base64.b64decode(data_uri.split(",", 1)[1])
        self.assertLessEqual(len(normalized_bytes), byte_limit)
        self.assertTrue(data_uri.startswith("data:image/jpeg;base64,"))
        with Image.open(io.BytesIO(normalized_bytes)) as normalized:
            self.assertEqual(normalized.format, "JPEG")
            self.assertLess(normalized.width, 1024, "Oversized fallback must also resize to meet the byte limit")
            self.assertEqual(normalized.width, normalized.height)

    def test_animated_upload_is_rejected(self):
        animated = Path(self.temp_dir.name) / "animated.gif"
        first = Image.new("RGB", (16, 16), "red")
        second = Image.new("RGB", (16, 16), "blue")
        first.save(animated, save_all=True, append_images=[second], duration=50)
        with self.assertRaises(image_service.ImageValidationError):
            image_service.encode_image(animated)

    def test_empty_and_overlong_questions_are_rejected_before_model_calls(self):
        with patch.object(image_service, "_request_json") as model:
            for question in (" ", "x" * (image_service.MAX_QUESTION_LENGTH + 1)):
                with self.subTest(length=len(question)):
                    with self.assertRaises(image_service.ImageValidationError):
                        image_service.process_image_question(self.image_path, question)
        model.assert_not_called()

    def test_detected_absence_of_text_prevents_ocr_even_if_router_selects_ocr(self):
        with self.model_replies(route=self.route(mode="OCR", has_text=False)):
            result = image_service.process_image_question(self.image_path, "What color is it?")
        self.assertEqual(result["mode"], "VISUAL")
        self.assertFalse(result["ocr_required"])
        self.assertIsNone(result["ocr_text"])
        self.assertFalse(any(call[0] == prompts.IMAGE_TEXT_PROMPT for call in self.calls))

    def test_irrelevant_visible_text_does_not_trigger_ocr_for_visual_question(self):
        with self.model_replies(route=self.route(mode="VISUAL", has_text=True)):
            result = image_service.process_image_question(self.image_path, "What color is the car?")
        self.assertTrue(result["has_text"])
        self.assertFalse(result["ocr_required"])
        self.assertIsNone(result["ocr_text"])
        self.assertFalse(any(call[0] == prompts.IMAGE_TEXT_PROMPT for call in self.calls))

    def test_arabic_and_mixed_ocr_preserves_original_text_and_question_language(self):
        samples = [
            ("ما رقم الفاتورة؟", "رقم الفاتورة: AR-٣٥\nالمجموع: ١٢ دينار", "ar", "رقم الفاتورة AR-٣٥."),
            ("What is the invoice number?", "فاتورة / Invoice\nرقم: MIX-204\nTotal: 15 JOD", "en", "The invoice number is MIX-204."),
        ]
        for question, text, language, final_answer in samples:
            with self.subTest(language=language):
                self.calls.clear()
                reply = {"status": "supported", "answer": final_answer, "used_chunk_indexes": []}
                with self.model_replies(route=self.route(language=language), text=text, answer=reply):
                    result = image_service.process_image_question(self.image_path, question)
                self.assertEqual(result["ocr_text"], text)
                self.assertEqual(result["language"], language)
                self.assertEqual(result["answer"], final_answer)
                generation = next(call for call in self.calls if call[0] == prompts.IMAGE_GROUNDED_PROMPT)
                self.assertEqual(generation[1]["ocr_text"], text)
                self.assertEqual(generation[1]["response_language"], language)
                self.assertIsNone(generation[2], "OCR answers must not reread uncertain text from image")

    def test_question_language_is_not_changed_by_quoted_foreign_label(self):
        samples = [
            ("What does the Arabic label 'يوغا' say?", "en"),
            ("ما معنى اسم المنتج MORINGA TEA؟", "ar"),
        ]
        for question, language in samples:
            with self.subTest(language=language):
                self.calls.clear()
                with self.model_replies(route=self.route(language=language), text="يوغا / MORINGA TEA"):
                    result = image_service.process_image_question(self.image_path, question)
                self.assertEqual(result["language"], language)
                generation = next(call for call in self.calls if call[0] == prompts.IMAGE_GROUNDED_PROMPT)
                self.assertEqual(generation[1]["response_language"], language)

    def test_unreadable_text_is_preserved_with_warning_and_no_invented_answer(self):
        reply = {"status": "unavailable", "answer": "The number is unreadable.", "used_chunk_indexes": []}
        with self.model_replies(route=self.route(), text="Invoice: [UNREADABLE]", unreadable=True, answer=reply):
            result = image_service.process_image_question(self.image_path, "What is the invoice number?")
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["sources"], [])
        self.assertIn("[UNREADABLE]", result["ocr_text"])
        self.assertTrue(result["warnings"])

    def test_missing_requested_information_discards_cited_sources(self):
        reply = {"status": "unavailable", "answer": "Made-up contact details", "used_chunk_indexes": [1]}
        with self.model_replies(route=self.route(), text="Invoice: EN-204", answer=reply):
            result = image_service.process_image_question(self.image_path, "What is the owner's phone number?")
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["sources"], [])
        self.assertNotIn("Made-up", result["answer"])

    def test_both_mode_supplies_visual_and_textual_evidence(self):
        with self.model_replies(route=self.route(mode="BOTH"), text="MORINGA TEA"):
            result = image_service.process_image_question(self.image_path, "What color is the package and what is its label?")
        self.assertTrue(result["ocr_required"])
        generation = next(call for call in self.calls if call[0] == prompts.IMAGE_GROUNDED_PROMPT)
        self.assertEqual(generation[1]["ocr_text"], "MORINGA TEA")
        self.assertTrue(generation[2].startswith("data:image/png;base64,"))

    def test_rag_uses_existing_search_and_quality_with_only_valid_supported_sources(self):
        chunks = [
            {"source": "1_Moringa_Tea_Health_Guide.docx", "content": "Steep moringa leaves in hot water."},
            {"source": "irrelevant.docx", "content": "Unrelated information."},
        ]
        reply = {"status": "supported", "answer": "The label identifies moringa tea; the KB says to steep the leaves.",
                 "used_chunk_indexes": [1, 1, 999, True, "2"]}
        with self.model_replies(route=self.route(needs_rag=True), text="MORINGA TEA", answer=reply), \
                patch.object(image_service, "rag_search", return_value=chunks) as search, \
                patch.object(image_service, "check_retrieval_quality", return_value={"sufficient": True}) as quality:
            result = image_service.process_image_question(self.image_path, "What is this product and how do our documents say to prepare it?")
        search.assert_called_once_with("Moringa tea preparation instructions")
        quality.assert_called_once_with("Moringa tea preparation instructions", chunks)
        self.assertEqual(result["sources"], ["1_Moringa_Tea_Health_Guide.docx"])

    def test_verifier_uses_cited_chunks_and_cannot_borrow_support_from_uncited_chunk(self):
        chunks = [
            {"source": "3_Beginners_Guide_to_Gardening.docx", "content": "Water garden plants when the soil is dry."},
            {"source": "5_Introduction_to_Yoga.docx", "content": "Yoga breathing can help reduce stress."},
        ]
        route = self.route(needs_rag=True)
        route["rag_query"] = "yoga breathing stress reduction"
        reply = {"status": "supported", "answer": "The label says yoga. Yoga breathing can help reduce stress.",
                 "used_chunk_indexes": [1]}
        with self.model_replies(
                route=route, text="YOGA", answer=reply,
                verification={"grounded": False, "reason": "The cited gardening chunk does not support the stress claim."}), \
                patch.object(image_service, "rag_search", return_value=chunks), \
                patch.object(image_service, "check_retrieval_quality", return_value={"sufficient": True}):
            result = image_service.process_image_question(self.image_path, "What activity is named here and how do our documents say it reduces stress?")
        generation = next(call for call in self.calls if call[0] == prompts.IMAGE_GROUNDED_PROMPT)
        verification = next(call for call in self.calls if call[0] == prompts.IMAGE_VERIFY_PROMPT)
        self.assertEqual(len(generation[1]["knowledge_base"]), 2)
        self.assertEqual(verification[1]["knowledge_base"], [
            {"index": 1, "source": chunks[0]["source"], "content": chunks[0]["content"]}
        ])
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["sources"], [])

    def test_rag_quality_requires_boolean_true_and_rejects_truthy_string(self):
        chunks = [{"source": "unsupported.docx", "content": "Moringa cures every disease."}]
        reply = {"status": "partial", "answer": "The label identifies moringa tea; no sufficient KB details are available.",
                 "used_chunk_indexes": [1]}
        for sufficient in (False, "true", "false", 1, None):
            with self.subTest(sufficient=sufficient):
                self.calls.clear()
                with self.model_replies(route=self.route(needs_rag=True), text="MORINGA TEA", answer=reply), \
                        patch.object(image_service, "rag_search", return_value=chunks), \
                        patch.object(image_service, "check_retrieval_quality", return_value={"sufficient": sufficient}):
                    result = image_service.process_image_question(self.image_path, "Compare this product with our knowledge base.")
                self.assertEqual(result["sources"], [])
                self.assertNotEqual(result["status"], "supported")
                generation = next(call for call in self.calls if call[0] == prompts.IMAGE_GROUNDED_PROMPT)
                self.assertEqual(generation[1]["knowledge_base"], [])

    def test_retrieval_failure_fails_closed_with_no_sources(self):
        reply = {"status": "partial", "answer": "The product is moringa tea; the knowledge base is unavailable.",
                 "used_chunk_indexes": []}
        with self.model_replies(route=self.route(needs_rag=True), text="MORINGA TEA", answer=reply), \
                patch.object(image_service, "rag_search", side_effect=RuntimeError("search is unavailable")):
            result = image_service.process_image_question(self.image_path, "What do our documents say about this product?")
        self.assertEqual(result["sources"], [])
        self.assertFalse(result["retrieval_quality"]["sufficient"])
        self.assertTrue(result["warnings"])

    def test_invalid_router_boolean_is_rejected(self):
        route = self.route()
        route["has_text"] = "false"
        with self.model_replies(route=route):
            with self.assertRaises(image_service.ImageProcessingError):
                image_service.process_image_question(self.image_path, "Read the number.")

    def test_grounding_verifier_rejects_generated_fact_missing_from_ocr(self):
        reply = {"status": "supported", "answer": "The owner's phone number is 0791234567.",
                 "used_chunk_indexes": []}
        for grounded in (False, "true", 1, None):
            with self.subTest(grounded=grounded):
                with self.model_replies(
                        route=self.route(), text="Invoice: EN-204", answer=reply,
                        verification={"grounded": grounded, "reason": "No phone number is present."}):
                    result = image_service.process_image_question(self.image_path, "What is the owner's phone number?")
                self.assertEqual(result["status"], "unavailable")
                self.assertEqual(result["sources"], [])
                self.assertNotIn("0791234567", result["answer"])
                self.assertTrue(result["warnings"])


class ImageEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app import app
        cls.app = app
        cls.app.config.update(TESTING=True)

    def test_same_filename_uploads_use_distinct_owned_directories_and_cleanup(self):
        saved_paths = []

        def inspect_upload(image_path, question):
            saved_paths.append(Path(image_path))
            self.assertTrue(Path(image_path).is_file())
            self.assertEqual(Path(image_path).read_bytes(), b"first" if len(saved_paths) == 1 else b"second")
            return {"answer": question, "sources": []}

        with self.app.test_client() as client, patch("app.process_image_question", side_effect=inspect_upload):
            for contents in (b"first", b"second"):
                response = client.post("/image-chat", data={
                    "message": "What is shown?", "image": (io.BytesIO(contents), "same-name.png")
                })
                self.assertEqual(response.status_code, 200)
        self.assertNotEqual(saved_paths[0].parent, saved_paths[1].parent)
        self.assertTrue(all(not path.parent.exists() for path in saved_paths))

    def test_temporary_upload_is_cleaned_after_processing_failure(self):
        saved_paths = []

        def reject_upload(image_path, question):
            saved_paths.append(Path(image_path))
            raise image_service.ImageProcessingError("Vision is temporarily unavailable.")

        with self.app.test_client() as client, patch("app.process_image_question", side_effect=reject_upload):
            response = client.post("/image-chat", data={
                "message": "What is shown?", "image": (io.BytesIO(b"invalid"), "same-name.png")
            })
        self.assertEqual(response.status_code, 502)
        self.assertFalse(saved_paths[0].parent.exists())

    def test_spoofed_image_upload_returns_bad_request(self):
        with self.app.test_client() as client:
            response = client.post("/image-chat", data={
                "message": "What is shown?", "image": (io.BytesIO(b"plain text"), "spoof.png")
            })
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.get_json())

    def test_task_datasets_preserve_exactly_eight_distinct_cases_each(self):
        with self.app.test_client() as client:
            for endpoint in ("/image-test-cases", "/voice-test-cases"):
                with self.subTest(endpoint=endpoint):
                    response = client.get(endpoint)
                    self.assertEqual(response.status_code, 200)
                    cases = response.get_json()["test_cases"]
                    self.assertEqual(len(cases), 8)
                    self.assertEqual([case["id"] for case in cases], list(range(1, 9)))


if __name__ == "__main__":
    unittest.main()
