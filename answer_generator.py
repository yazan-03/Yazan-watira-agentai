import os
from dotenv import load_dotenv
from openai import AzureOpenAI

from prompts import ANSWER_GENERATION_PROMPT


load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-01"
)

GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


def generate_answer(question, retrieved_chunks):

    context_parts = []

    for i, chunk in enumerate(retrieved_chunks, start=1):
        context_parts.append(
            f"Chunk {i}\n"
            f"Source: {chunk['source']}\n"
            f"Content: {chunk['content']}"
        )

    context = "\n\n".join(context_parts)

    prompt = ANSWER_GENERATION_PROMPT.format(
        question=question,
        context=context
    )

    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": (
                    "You generate grounded answers using only "
                    "the retrieved knowledge-base context."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    return response.choices[0].message.content