import os

from dotenv import load_dotenv
from openai import AzureOpenAI


load_dotenv()

OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


client = AzureOpenAI(
    api_key=OPENAI_KEY,
    azure_endpoint=OPENAI_ENDPOINT,
    api_version="2024-02-01"
)


def generate_answer(question, search_results):

    context_parts = []

    for i, result in enumerate(search_results, start=1):
        context_parts.append(
            f"""
Document {i}
Source: {result['source']}
Content:
{result['content']}
"""
        )

    context = "\n".join(context_parts)

    system_prompt = system_prompt = """
You are a helpful AI assistant that answers questions based only on
the retrieved document context.

Rules:
1. Use ONLY information explicitly supported by the retrieved context.
2. Do NOT use outside knowledge or make assumptions.
3. If the context fully answers the question, provide a clear and concise answer.
4. If the context contains only part of the answer:
   - Answer the part that is supported by the context.
   - Clearly state which part could not be found in the provided documents.
5. If the context does not contain any information relevant to the question, say:
   "I could not find this information in the provided documents."
6. Do not invent, infer, or add information that is not supported by the context.
7. Keep the answer clear and concise.
"""

    user_prompt = f"""
Retrieved context:

{context}

User question:

{question}
"""

    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ]
    )

    return response.choices[0].message.content