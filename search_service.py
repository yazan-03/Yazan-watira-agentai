import os

from dotenv import load_dotenv
from openai import AzureOpenAI
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery


load_dotenv()

SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
SEARCH_KEY = os.getenv("AZURE_SEARCH_KEY")
INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX")

OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
EMBEDDING_DEPLOYMENT = os.getenv(
    "AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
)


openai_client = AzureOpenAI(
    api_key=OPENAI_KEY,
    azure_endpoint=OPENAI_ENDPOINT,
    api_version="2024-02-01"
)


search_client = SearchClient(
    endpoint=SEARCH_ENDPOINT,
    index_name=INDEX_NAME,
    credential=AzureKeyCredential(SEARCH_KEY)
)


def create_embedding(text):
    response = openai_client.embeddings.create(
        model=EMBEDDING_DEPLOYMENT,
        input=text
    )

    return response.data[0].embedding


# --------------------------------------------------
# VECTOR SEARCH
# --------------------------------------------------

def vector_search(question, top_k=5):

    question_vector = create_embedding(question)

    vector_query = VectorizedQuery(
        vector=question_vector,
        k_nearest_neighbors=top_k,
        fields="contentVector"
    )

    results = search_client.search(
        search_text=None,
        vector_queries=[vector_query],
        select=["id", "content", "source"],
        top=top_k
    )

    retrieved_chunks = []

    for result in results:
        retrieved_chunks.append(
            {
                "id": result["id"],
                "content": result["content"],
                "source": result["source"],
                "score": result["@search.score"],
                "reranker_score": None
            }
        )

    return retrieved_chunks


# --------------------------------------------------
# KEYWORD SEARCH
# --------------------------------------------------

def keyword_search(question, top_k=5):

    results = search_client.search(
        search_text=question,
        select=["id", "content", "source"],
        top=top_k
    )

    retrieved_chunks = []

    for result in results:
        retrieved_chunks.append(
            {
                "id": result["id"],
                "content": result["content"],
                "source": result["source"],
                "score": result["@search.score"],
                "reranker_score": None
            }
        )

    return retrieved_chunks


# --------------------------------------------------
# METADATA-FILTERED SEARCH
# --------------------------------------------------

def metadata_search(question, source, top_k=5):

    results = search_client.search(
        search_text=question,
        filter=f"source eq '{source}'",
        query_type="semantic",
        semantic_configuration_name="semantic-config",
        select=["id", "content", "source"],
        top=top_k
    )

    retrieved_chunks = []

    for result in results:
        retrieved_chunks.append(
            {
                "id": result["id"],
                "content": result["content"],
                "source": result["source"],
                "score": result["@search.score"],
                "reranker_score": result.get("@search.reranker_score")
            }
        )

    return retrieved_chunks


# --------------------------------------------------
# HYBRID SEARCH + SEMANTIC RERANKING
# --------------------------------------------------

def hybrid_search(question, top_k=5):

    question_vector = create_embedding(question)

    vector_query = VectorizedQuery(
        vector=question_vector,
        k_nearest_neighbors=top_k,
        fields="contentVector"
    )

    results = search_client.search(
        search_text=question,
        vector_queries=[vector_query],

        query_type="semantic",
        semantic_configuration_name="semantic-config",

        select=["id", "content", "source"],
        top=top_k
    )

    retrieved_chunks = []

    for result in results:
        retrieved_chunks.append(
            {
                "id": result["id"],
                "content": result["content"],
                "source": result["source"],
                "score": result["@search.score"],
                "reranker_score": result.get("@search.reranker_score")
            }
        )

    return retrieved_chunks


if __name__ == "__main__":

    question = input("Ask a question: ")

    print("\nVECTOR SEARCH")
    vector_results = vector_search(question)

    for i, result in enumerate(vector_results, start=1):
        print("=" * 80)
        print(f"Result {i}")
        print(f"Source: {result['source']}")
        print(f"Score: {result['score']}")
        print("\nContent:")
        print(result["content"])


    print("\n\nKEYWORD SEARCH")
    keyword_results = keyword_search(question)

    for i, result in enumerate(keyword_results, start=1):
        print("=" * 80)
        print(f"Result {i}")
        print(f"Source: {result['source']}")
        print(f"Score: {result['score']}")
        print("\nContent:")
        print(result["content"])


    print("\n\nHYBRID SEARCH")
    hybrid_results = hybrid_search(question)

    for i, result in enumerate(hybrid_results, start=1):
        print("=" * 80)
        print(f"Result {i}")
        print(f"Source: {result['source']}")
        print(f"Hybrid Score: {result['score']}")
        print(f"Semantic Score: {result['reranker_score']}")
        print("\nContent:")
        print(result["content"])