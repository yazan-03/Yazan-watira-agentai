import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

from prompts import RERANKING_PROMPT


load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-01"
)

GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


def rerank_chunks(question, chunks, top_k=3):

    # If there are no chunks, return an empty result
    if not chunks:
        return {
            "reranked_chunks": [],
            "ranked_chunk_ids": []
        }

    # Prepare candidate chunks for the prompt
    chunk_parts = []

    for chunk in chunks:
        chunk_parts.append(
            f"Chunk ID: {chunk['id']}\n"
            f"Source: {chunk['source']}\n"
            f"Content: {chunk['content']}"
        )

    chunks_text = "\n\n".join(chunk_parts)

    prompt = RERANKING_PROMPT.format(
        question=question,
        chunks=chunks_text
    )

    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": (
                    "You re-rank retrieved chunks by relevance "
                    "for an Adaptive RAG system."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    result = json.loads(
        response.choices[0].message.content
    )

    ranked_ids = result["ranked_chunk_ids"]

    # Map chunk IDs back to the original chunk objects
    chunk_map = {
        chunk["id"]: chunk
        for chunk in chunks
    }

    reranked_chunks = []

    for chunk_id in ranked_ids:

        if chunk_id in chunk_map:
            reranked_chunks.append(
                chunk_map[chunk_id]
            )

    # Keep only the best chunks
    reranked_chunks = reranked_chunks[:top_k]

    return {
        "reranked_chunks": reranked_chunks,
        "ranked_chunk_ids": ranked_ids
    }


if __name__ == "__main__":

    from adaptive_retrieval import adaptive_retrieve

    question = input("Ask a question: ")

    # Retrieve more candidates than we finally need
    retrieval = adaptive_retrieve(
        question,
        top_k=5
    )

    candidates = retrieval["results"]

    print("\nBEFORE RE-RANKING:")

    for i, chunk in enumerate(candidates, start=1):
        print(
            f"{i}. {chunk['source']} "
            f"({chunk['id']})"
        )

    reranking = rerank_chunks(
        question,
        candidates,
        top_k=3
    )

    print("\nAFTER RE-RANKING:")

    for i, chunk in enumerate(
        reranking["reranked_chunks"],
        start=1
    ):
        print(
            f"{i}. {chunk['source']} "
            f"({chunk['id']})"
        )