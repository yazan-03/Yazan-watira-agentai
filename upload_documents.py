import os
from pathlib import Path

from docx import Document
from dotenv import load_dotenv
from openai import AzureOpenAI
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient


# Load variables from .env
load_dotenv()

SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
SEARCH_KEY = os.getenv("AZURE_SEARCH_KEY")
INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX")

OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
EMBEDDING_DEPLOYMENT = os.getenv(
    "AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
)


# Azure OpenAI client
openai_client = AzureOpenAI(
    api_key=OPENAI_KEY,
    azure_endpoint=OPENAI_ENDPOINT,
    api_version="2024-02-01"
)


# Azure AI Search client
search_client = SearchClient(
    endpoint=SEARCH_ENDPOINT,
    index_name=INDEX_NAME,
    credential=AzureKeyCredential(SEARCH_KEY)
)


def read_word_file(file_path):
    """Extract text from a Word document."""

    document = Document(file_path)

    paragraphs = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()

        if text:
            paragraphs.append(text)

    return "\n".join(paragraphs)


def chunk_text(text, chunk_size=1200, overlap_paragraphs=1):
    paragraphs = [
        p.strip()
        for p in text.split("\n")
        if p.strip()
    ]

    chunks = []
    current_paragraphs = []
    current_length = 0

    for paragraph in paragraphs:
        paragraph_length = len(paragraph)

        if current_paragraphs and current_length + paragraph_length + 1 > chunk_size:
            chunk = "\n".join(current_paragraphs).strip()

            if len(chunk) >= 150:
                chunks.append(chunk)

            overlap = current_paragraphs[-overlap_paragraphs:]

            current_paragraphs = overlap.copy()
            current_length = sum(len(p) + 1 for p in current_paragraphs)

        current_paragraphs.append(paragraph)
        current_length += paragraph_length + 1

    if current_paragraphs:
        chunk = "\n".join(current_paragraphs).strip()

        if len(chunk) >= 150:
            chunks.append(chunk)

    return chunks


def create_embedding(text):
    """Create an embedding using Azure OpenAI."""

    response = openai_client.embeddings.create(
        model=EMBEDDING_DEPLOYMENT,
        input=text
    )

    return response.data[0].embedding


def process_documents():

    documents_folder = Path("documents")

    documents_to_upload = []

    for file_path in documents_folder.glob("*.docx"):

        print(f"Processing: {file_path.name}")

        text = read_word_file(file_path)

        chunks = chunk_text(text)

        for chunk_number, chunk in enumerate(chunks):

            print(
                f"  Creating embedding for chunk "
                f"{chunk_number + 1}/{len(chunks)}"
            )

            embedding = create_embedding(chunk)

            documents_to_upload.append(
                {
                    "id": f"{file_path.stem}-{chunk_number}",
                    "content": chunk,
                    "source": file_path.name,
                    "contentVector": embedding
                }
            )

    print("\nUploading documents to Azure AI Search...")

    result = search_client.upload_documents(
        documents=documents_to_upload
    )

    successful = sum(1 for item in result if item.succeeded)

    print(
        f"Successfully uploaded "
        f"{successful}/{len(result)} chunks."
    )


if __name__ == "__main__":
    process_documents()

    