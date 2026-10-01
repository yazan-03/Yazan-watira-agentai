import json
import os

from dotenv import load_dotenv
from openai import AzureOpenAI

from prompts import (
    CONTEXT_RELEVANCE_EVAL_PROMPT,
    ANSWER_CORRECTNESS_EVAL_PROMPT,
    FAITHFULNESS_EVAL_PROMPT,
)

load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-01"
)

GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


def _call_evaluator(prompt):
    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a strict RAG evaluation judge. "
                    "Follow the evaluation instructions exactly."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    content = response.choices[0].message.content.strip()

    return json.loads(content)


def _build_context(chunks):
    if not chunks:
        return "No retrieved context."

    context_parts = []

    for chunk in chunks:
        context_parts.append(
            f"Chunk ID: {chunk['id']}\n"
            f"Source: {chunk['source']}\n"
            f"Content:\n{chunk['content']}"
        )

    return "\n\n---\n\n".join(context_parts)


def evaluate_context_relevance(question, chunks):
    context = _build_context(chunks)

    prompt = CONTEXT_RELEVANCE_EVAL_PROMPT.format(
        question=question,
        context=context,
    )

    return _call_evaluator(prompt)


def evaluate_answer_correctness(
    question,
    expected_information,
    answer,
):
    prompt = ANSWER_CORRECTNESS_EVAL_PROMPT.format(
        question=question,
        expected_information=expected_information,
        answer=answer,
    )

    return _call_evaluator(prompt)


def evaluate_faithfulness(chunks, answer):
    context = _build_context(chunks)

    prompt = FAITHFULNESS_EVAL_PROMPT.format(
        context=context,
        answer=answer,
    )

    return _call_evaluator(prompt)


def evaluate_rag_quality(
    question,
    expected_information,
    chunks,
    answer,
):
    context_relevance = evaluate_context_relevance(
        question,
        chunks,
    )

    answer_correctness = evaluate_answer_correctness(
        question,
        expected_information,
        answer,
    )

    faithfulness = evaluate_faithfulness(
        chunks,
        answer,
    )

    return {
        "context_relevance": context_relevance,
        "answer_correctness": answer_correctness,
        "faithfulness": faithfulness,
    }

if __name__ == "__main__":
    from adaptive_rag import adaptive_rag

    question = "What are the health benefits of yoga?"

    expected_information = (
        "Yoga can improve flexibility and posture, reduce stress, "
        "support sleep, and improve body awareness."
    )

    rag_result = adaptive_rag(question)

    chunks = rag_result["final_retrieval"]["results"]
    answer = rag_result["answer"]

    evaluation = evaluate_rag_quality(
        question=question,
        expected_information=expected_information,
        chunks=chunks,
        answer=answer,
    )

    print("\nContext Relevance:")
    print(evaluation["context_relevance"])

    print("\nAnswer Correctness:")
    print(evaluation["answer_correctness"])

    print("\nFaithfulness / Groundedness:")
    print(evaluation["faithfulness"])