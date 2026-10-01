import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

from prompts import MULTI_HOP_PROMPT


load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-01"
)

GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


def decompose_query(question):

    prompt = MULTI_HOP_PROMPT.format(
        question=question
    )

    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": (
                    "You decompose complex questions into focused "
                    "retrieval sub-queries for an Adaptive RAG system."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    result = response.choices[0].message.content

    return json.loads(result)


def multi_hop_retrieve(question, top_k=3):

    from adaptive_retrieval import adaptive_retrieve

    # Step 1: Decompose the original question
    decomposition = decompose_query(question)

    sub_queries = decomposition["sub_queries"]

    all_chunks = []
    hops = []

    # Step 2: Retrieve information for each sub-query
    for sub_query in sub_queries:

        retrieval = adaptive_retrieve(
            sub_query,
            top_k
        )

        chunks = retrieval["results"]

        hops.append(
            {
                "sub_query": sub_query,
                "strategy_used": retrieval["strategy_used"],
                "results": chunks
            }
        )

        all_chunks.extend(chunks)

    # Step 3: Remove duplicate chunks
    unique_chunks = []
    seen_ids = set()

    for chunk in all_chunks:

        if chunk["id"] not in seen_ids:
            unique_chunks.append(chunk)
            seen_ids.add(chunk["id"])

    return {
        "sub_queries": sub_queries,
        "hops": hops,
        "results": unique_chunks
    }


if __name__ == "__main__":

    question = input("Enter a complex question: ")

    result = multi_hop_retrieve(question)

    print("\n" + "=" * 80)
    print("MULTI-HOP RETRIEVAL")
    print("=" * 80)

    for i, hop in enumerate(result["hops"], start=1):

        print(f"\nHop {i}")
        print(f"Sub-query: {hop['sub_query']}")
        print(f"Strategy: {hop['strategy_used']}")

        print("Sources:")

        for chunk in hop["results"]:
            print(f"- {chunk['source']}")

    print("\n" + "=" * 80)
    print("COMBINED UNIQUE CHUNKS")
    print("=" * 80)

    for i, chunk in enumerate(result["results"], start=1):
        print(
            f"{i}. {chunk['source']} "
            f"({chunk['id']})"
        )