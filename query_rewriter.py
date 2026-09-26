import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

from prompts import QUERY_REWRITE_PROMPT


load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-01"
)

GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


def rewrite_query(question, reason):

    prompt = QUERY_REWRITE_PROMPT.format(
        question=question,
        reason=reason
    )

    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": "You rewrite queries to improve retrieval in an Adaptive RAG system."
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

    question = input("Original question: ")

    reason = input("Why was retrieval insufficient? ")

    result = rewrite_query(
        question,
        reason
    )

    print("\nQuery Rewrite Result:")
    print(json.dumps(result, indent=2))