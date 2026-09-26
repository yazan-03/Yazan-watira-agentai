from adaptive_retrieval import adaptive_retrieve
from quality_check import check_retrieval_quality
from query_rewriter import rewrite_query
from answer_generator import generate_answer
from multi_hop import multi_hop_retrieve
from reranker import rerank_chunks


def adaptive_rag(question, top_k=5):

    # -----------------------------------
    # Attempt 1: Initial Retrieval
    # -----------------------------------

    first_retrieval = adaptive_retrieve(
        question,
        top_k
    )

    query_analysis = first_retrieval["query_analysis"]

    use_multi_hop = (
        query_analysis["needs_multiple_sources"]
    )

    if use_multi_hop:

        multi_hop_output = multi_hop_retrieve(
            question,
            top_k=3
        )

        first_retrieval["results"] = multi_hop_output["results"]
        first_retrieval["multi_hop"] = True
        first_retrieval["hops"] = multi_hop_output["hops"]
        first_retrieval["strategy_used"] = "multi-hop"

    else:

        first_retrieval["multi_hop"] = False
        first_retrieval["hops"] = []


    # -----------------------------------
    # Re-rank retrieved candidate chunks
    # -----------------------------------

    first_candidates = first_retrieval["results"]

    first_reranking = rerank_chunks(
        question,
        first_candidates,
        top_k=3
    )

    first_retrieval["candidates_before_reranking"] = first_candidates
    first_retrieval["results"] = first_reranking["reranked_chunks"]
    first_retrieval["reranking_applied"] = True
    first_retrieval["ranked_chunk_ids"] = first_reranking["ranked_chunk_ids"]

    first_results = first_retrieval["results"]

    first_quality = check_retrieval_quality(
        question,
        first_results
    )

    # -----------------------------------
    # If Attempt 1 is sufficient
    # -----------------------------------

    if first_quality["sufficient"]:

        answer = generate_answer(
            question,
            first_results
        )

        sources = list(dict.fromkeys(
            chunk["source"]
            for chunk in first_results
        ))

        return {
            "original_question": question,
            "answer": answer,
            "sources": sources,
            "rewrite_triggered": False,
            "rewritten_query": None,
            "retrieval_attempts": 1,
            "final_retrieval": first_retrieval,
            "final_quality": first_quality
        }

    # -----------------------------------
    # Attempt 2: Rewrite Query
    # -----------------------------------

    rewrite_result = rewrite_query(
        question,
        first_quality["reason"]
    )

    rewritten_query = rewrite_result["rewritten_query"]

    # -----------------------------------
    # Attempt 2: Retrieve Again
    # -----------------------------------

    second_retrieval = adaptive_retrieve(
        rewritten_query,
        top_k
    )

    second_candidates = second_retrieval["results"]

    second_reranking = rerank_chunks(
        question,
        second_candidates,
        top_k=3
    )

    second_retrieval["candidates_before_reranking"] = second_candidates
    second_retrieval["results"] = second_reranking["reranked_chunks"]
    second_retrieval["reranking_applied"] = True
    second_retrieval["ranked_chunk_ids"] = second_reranking["ranked_chunk_ids"]

    second_results = second_retrieval["results"]

    second_quality = check_retrieval_quality(
        question,
        second_results
    )

    # -----------------------------------
    # If Attempt 2 is sufficient
    # -----------------------------------

    if second_quality["sufficient"]:

        answer = generate_answer(
            question,
            second_results
        )

        sources = list(dict.fromkeys(
            chunk["source"]
            for chunk in second_results
        ))

    else:

        answer = (
            "I could not find enough information in the "
            "available knowledge base to answer this question."
        )

        sources = []

    # -----------------------------------
    # Final Result
    # -----------------------------------

    return {
        "original_question": question,
        "answer": answer,
        "sources": sources,
        "rewrite_triggered": True,
        "rewritten_query": rewritten_query,
        "retrieval_attempts": 2,
        "initial_retrieval": first_retrieval,
        "initial_quality": first_quality,
        "final_retrieval": second_retrieval,
        "final_quality": second_quality
    }


if __name__ == "__main__":

    question = input("Ask a question: ")

    result = adaptive_rag(question)

    print("\n" + "=" * 80)
    print("ADAPTIVE RAG RESULT")
    print("=" * 80)

    print("\nOriginal Question:")
    print(result["original_question"])

    print("\nRewrite Triggered:")
    print(result["rewrite_triggered"])

    if result["rewrite_triggered"]:
        print("\nRewritten Query:")
        print(result["rewritten_query"])

    print("\nRetrieval Attempts:")
    print(result["retrieval_attempts"])

    print("\nFinal Strategy:")
    print(result["final_retrieval"]["strategy_used"])

    # -----------------------------------
    # Re-ranking Trace
    # -----------------------------------

    print("\nRe-ranking Applied:")
    print(
        result["final_retrieval"].get(
            "reranking_applied",
            False
        )
    )

    print("\nBefore Re-ranking:")

    before_reranking = result["final_retrieval"].get(
        "candidates_before_reranking",
        []
    )

    for i, chunk in enumerate(before_reranking, start=1):
        print(
            f"{i}. {chunk['source']} "
            f"({chunk['id']})"
        )

    print("\nAfter Re-ranking:")

    after_reranking = result["final_retrieval"]["results"]

    for i, chunk in enumerate(after_reranking, start=1):
        print(
            f"{i}. {chunk['source']} "
            f"({chunk['id']})"
        )

    # -----------------------------------
    # Final Quality
    # -----------------------------------

    print("\nFinal Quality:")
    print(result["final_quality"])

    # -----------------------------------
    # Final Answer
    # -----------------------------------

    print("\nFinal Answer:")
    print(result["answer"])

    # -----------------------------------
    # Sources
    # -----------------------------------

    print("\nSources:")

    if result["sources"]:
        for source in result["sources"]:
            print(f"- {source}")
    else:
        print("- No supporting sources found")