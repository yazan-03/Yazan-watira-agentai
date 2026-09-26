import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

from prompts import QUALITY_CHECK_PROMPT


load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-01"
)

GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


def check_retrieval_quality(question, retrieved_chunks):

    context_parts = []

    for i, chunk in enumerate(retrieved_chunks, start=1):
        context_parts.append(
            f"Chunk {i}\n"
            f"Source: {chunk['source']}\n"
            f"Content: {chunk['content']}"
        )

    context = "\n\n".join(context_parts)

    prompt = QUALITY_CHECK_PROMPT.format(
        question=question,
        context=context
    )

    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": "You evaluate retrieval quality for an Adaptive RAG system."
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

if __name__ == "__main__":

    from adaptive_retrieval import adaptive_retrieve

    question = input("Ask a question: ")

    # Retrieve chunks using the adaptive retrieval system
    retrieval_output = adaptive_retrieve(question)

    retrieved_chunks = retrieval_output["results"]

    # Evaluate retrieval quality
    quality_result = check_retrieval_quality(
        question,
        retrieved_chunks
    )

    print("\nRetrieval Strategy:")
    print(retrieval_output["strategy_used"])

    print("\nRetrieved Sources:")
    for chunk in retrieved_chunks:
        print(f"- {chunk['source']}")

    print("\nQuality Check Result:")
    print(json.dumps(quality_result, indent=2))

