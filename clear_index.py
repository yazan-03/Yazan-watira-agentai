import os

from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient


load_dotenv()

SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
SEARCH_KEY = os.getenv("AZURE_SEARCH_KEY")
INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX")


search_client = SearchClient(
    endpoint=SEARCH_ENDPOINT,
    index_name=INDEX_NAME,
    credential=AzureKeyCredential(SEARCH_KEY)
)


def clear_index():

    results = search_client.search(
        search_text="*",
        select=["id"],
        top=1000
    )

    documents_to_delete = []

    for result in results:
        documents_to_delete.append({
            "id": result["id"]
        })

    if not documents_to_delete:
        print("Index is already empty.")
        return

    print(f"Deleting {len(documents_to_delete)} documents...")

    delete_results = search_client.delete_documents(
        documents=documents_to_delete
    )

    successful = sum(
        1 for item in delete_results
        if item.succeeded
    )

    print(
        f"Successfully deleted "
        f"{successful}/{len(delete_results)} documents."
    )


if __name__ == "__main__":
    clear_index()