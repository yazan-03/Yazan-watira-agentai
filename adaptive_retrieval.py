from query_understanding import understand_query
from search_service import (
    vector_search,
    keyword_search,
    hybrid_search,
    metadata_search
)


def adaptive_retrieve(question, top_k=5):

    # Step 1: Understand the query
    query_analysis = understand_query(question)

    strategy = query_analysis["retrieval_strategy"]

    # Step 2: Select the retrieval strategy
    if strategy == "vector":
        results = vector_search(question, top_k)

    elif strategy == "keyword":
        results = keyword_search(question, top_k)

    elif strategy == "hybrid":
        results = hybrid_search(question, top_k)

    elif strategy == "metadata":

        source = query_analysis.get("metadata_filter")

        if source:
            results = metadata_search(
                question,
                source,
                top_k
            )
        else:
            # If no metadata source was identified,
            # fall back to hybrid search.
            results = hybrid_search(question, top_k)
            strategy = "hybrid"

    else:
        # Fallback for any unexpected strategy
        results = hybrid_search(question, top_k)
        strategy = "hybrid"

    # Step 3: Return both the decision and retrieved chunks
    return {
        "query_analysis": query_analysis,
        "strategy_used": strategy,
        "results": results
    }

if __name__ == "__main__":

    question = input("Ask a question: ")

    output = adaptive_retrieve(question)

    print("\nQuery Analysis:")
    print(output["query_analysis"])

    print(f"\nRetrieval Strategy Used: {output['strategy_used']}")

    print("\nRetrieved Results:\n")

    for i, result in enumerate(output["results"], start=1):

        print("=" * 80)

        print(f"Result {i}")
        print(f"Source: {result['source']}")
        print(f"Score: {result['score']}")

        if result["reranker_score"] is not None:
            print(f"Semantic Score: {result['reranker_score']}")

        print("\nContent:")
        print(result["content"])

        print()