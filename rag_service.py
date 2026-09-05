from search_service import hybrid_search
from openai_service import generate_answer


def ask_agent(question):

    # Retrieve the top 3 chunks using Hybrid Search + Semantic Ranking
    search_results = hybrid_search(
        question=question,
        top_k=3
    )

    # Generate a grounded answer
    answer = generate_answer(
        question=question,
        search_results=search_results
    )

    # Unique retrieved sources
    sources = []

    for result in search_results:
        if result["source"] not in sources:
            sources.append(result["source"])

    # Ranking details
    ranking = []

    for position, result in enumerate(search_results, start=1):
        ranking.append({
            "rank": position,
            "source": result["source"],
            "id": result["id"],
            "hybrid_score": result["score"],
            "semantic_score": result["reranker_score"],
            "content": result["content"]
        })

    return {
        "answer": answer,
        "sources": sources,
        "ranking": ranking
    }


if __name__ == "__main__":

    question = input("Ask the agent: ")

    result = ask_agent(question)

    print("\nAnswer:\n")
    print(result["answer"])

    print("\nRetrieved Sources:")
    for source in result["sources"]:
        print(f"- {source}")

    print("\nRetrieval Ranking:")
    for item in result["ranking"]:
        print(
            f"#{item['rank']} {item['source']} | "
            f"Hybrid: {item['hybrid_score']:.4f} | "
            f"Semantic: {item['semantic_score']:.4f}"
        )