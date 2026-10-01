import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

from prompts import QUERY_UNDERSTANDING_PROMPT


load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-01"
)

GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


def understand_query(question):

    prompt = QUERY_UNDERSTANDING_PROMPT.format(
        question=question
    )

    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": "You classify queries for an Adaptive RAG system."
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

    question = input("Enter your question: ")

    result = understand_query(question)

    print("\nQuery Understanding Result:")
    print(json.dumps(result, indent=2))