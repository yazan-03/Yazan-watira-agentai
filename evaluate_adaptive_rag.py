import json
import time

from evaluation_dataset import TEST_CASES
from adaptive_rag import adaptive_rag
from rag_evaluator import evaluate_rag_quality


OUTPUT_FILE = "evaluation_results.json"


def precision_at_k(retrieved_ids, relevant_ids):
    """
    Precision@K = number of relevant retrieved chunks / K
    """
    if not retrieved_ids:
        return 0.0

    relevant_retrieved = sum(
        1
        for chunk_id in retrieved_ids
        if chunk_id in relevant_ids
    )

    return relevant_retrieved / len(retrieved_ids)


def retrieval_recall(retrieved_ids, relevant_ids):
    """
    Recall = number of relevant retrieved chunks /
             total number of relevant ground-truth chunks
    """

    # No relevant chunk exists in the KB.
    # Retrieval recall is not applicable.
    if not relevant_ids:
        return None

    relevant_retrieved = sum(
        1
        for chunk_id in relevant_ids
        if chunk_id in retrieved_ids
    )

    return relevant_retrieved / len(relevant_ids)


def prepare_chunks_for_json(chunks):
    """
    Keep the useful retrieved chunk information
    needed by the Adaptive RAG Evaluation UI.
    """
    prepared_chunks = []

    for chunk in chunks:
        prepared_chunks.append({
            "id": chunk.get("id"),
            "source": chunk.get("source"),
            "content": chunk.get("content"),
            "search_score": chunk.get("score"),
            "reranker_score": chunk.get("reranker_score"),
        })

    return prepared_chunks


def evaluate_test_case(test_case):
    query = test_case["query"]
    relevant_ids = test_case["relevant_chunk_ids"]

    print("\n" + "=" * 80)
    print(f"TEST #{test_case['id']} - {test_case['type']}")
    print("=" * 80)

    print(f"\nQuery:\n{query}")

    # --------------------------------------------------
    # Run Adaptive RAG
    # --------------------------------------------------

    start_time = time.perf_counter()

    result = adaptive_rag(query)

    latency = time.perf_counter() - start_time

    # Final chunks actually used after reranking.
    final_chunks = result["final_retrieval"]["results"]

    retrieved_ids = [
        chunk["id"]
        for chunk in final_chunks
    ]

    # --------------------------------------------------
# Re-ranking Information
# --------------------------------------------------

    reranking_applied = result["final_retrieval"].get(
        "reranking_applied",
        False
    )

    before_reranking_chunks = result["final_retrieval"].get(
        "candidates_before_reranking",
        []
    )

    before_reranking_ids = [
        chunk["id"]
        for chunk in before_reranking_chunks
    ]

    after_reranking_ids = retrieved_ids

    # --------------------------------------------------
    # Retrieval Metrics
    # --------------------------------------------------

    precision = precision_at_k(
        retrieved_ids,
        relevant_ids
    )

    recall = retrieval_recall(
        retrieved_ids,
        relevant_ids
    )

    # --------------------------------------------------
    # LLM-as-a-Judge Quality Metrics
    # --------------------------------------------------

    quality_metrics = evaluate_rag_quality(
        question=query,
        expected_information=test_case["expected_information"],
        chunks=final_chunks,
        answer=result["answer"],
    )

    context_relevance = (
        quality_metrics["context_relevance"]["score"]
    )

    answer_correctness = (
        quality_metrics["answer_correctness"]["score"]
    )

    faithfulness = (
        quality_metrics["faithfulness"]["score"]
    )

    # --------------------------------------------------
    # Print Test Details
    # --------------------------------------------------

    print("\nExpected Information:")
    print(test_case["expected_information"])

    print("\nFinal Strategy:")
    print(result["final_retrieval"]["strategy_used"])

    print("\nRetrieved Chunks:")

    if retrieved_ids:
        for chunk_id in retrieved_ids:
            print(f"- {chunk_id}")
    else:
        print("- No chunks retrieved")

    print("\nRewrite Triggered:")
    print(result["rewrite_triggered"])

    if result["rewrite_triggered"]:
        print("\nRewritten Query:")
        print(result.get("rewritten_query"))

    print("\nRetrieval Attempts:")
    print(result["retrieval_attempts"])

    print("\nFinal Quality:")
    print(result["final_quality"])

    print("\nFinal Answer:")
    print(result["answer"])

    print("\nSources:")

    if result["sources"]:
        for source in result["sources"]:
            print(f"- {source}")
    else:
        print("- No supporting sources found")

    # --------------------------------------------------
    # Print Metrics
    # --------------------------------------------------

    print("\nMetrics:")

    print(f"Precision@K: {precision:.3f}")

    if recall is None:
        print("Retrieval Recall: N/A")
    else:
        print(f"Retrieval Recall: {recall:.3f}")

    print(
        f"Context Relevance: "
        f"{context_relevance:.3f}"
    )

    print(
        f"Answer Correctness: "
        f"{answer_correctness:.3f}"
    )

    print(
        f"Faithfulness / Groundedness: "
        f"{faithfulness:.3f}"
    )

    print(f"Latency: {latency:.2f} seconds")

    # --------------------------------------------------
    # Return Test Result
    # --------------------------------------------------

    return {
        "id": test_case["id"],
        "type": test_case["type"],

        "query": query,
        "expected_information": (
            test_case["expected_information"]
        ),

        "strategy": (
            result["final_retrieval"]["strategy_used"]
        ),

        "retrieved_ids": retrieved_ids,
        "relevant_ids": relevant_ids,

        "reranking_applied": reranking_applied,

        "before_reranking_ids": before_reranking_ids,

        "after_reranking_ids": after_reranking_ids,

        "before_reranking_chunks": prepare_chunks_for_json(
            before_reranking_chunks
        ),

        "chunks": prepare_chunks_for_json(
            final_chunks
        ),

        "precision_at_k": precision,
        "retrieval_recall": recall,

        "context_relevance": context_relevance,
        "answer_correctness": answer_correctness,
        "faithfulness": faithfulness,

        "rewrite_triggered": (
            result["rewrite_triggered"]
        ),

        "rewritten_query": (
            result.get("rewritten_query")
        ),

        "retrieval_attempts": (
            result["retrieval_attempts"]
        ),

        "quality_sufficient": (
            result["final_quality"]["sufficient"]
        ),

        "quality_reason": (
            result["final_quality"]["reason"]
        ),

        "latency_seconds": latency,

        "answer": result["answer"],
        "sources": result["sources"],
    }


def run_adaptive_evaluation():
    all_results = []

    # --------------------------------------------------
    # Run Exactly 8 Test Cases
    # --------------------------------------------------

    for test_case in TEST_CASES:
        result = evaluate_test_case(test_case)
        all_results.append(result)

    # --------------------------------------------------
    # Evaluation Summary
    # --------------------------------------------------

    print("\n\n" + "=" * 80)
    print("EVALUATION SUMMARY")
    print("=" * 80)

    # Precision only applies to cases where
    # relevant ground-truth chunks exist.
    valid_precision = [
        r["precision_at_k"]
        for r in all_results
        if r["relevant_ids"]
    ]

    # Recall only applies when relevant chunks exist.
    valid_recall = [
        r["retrieval_recall"]
        for r in all_results
        if r["retrieval_recall"] is not None
    ]

    avg_precision = (
        sum(valid_precision) / len(valid_precision)
        if valid_precision
        else 0.0
    )

    avg_recall = (
        sum(valid_recall) / len(valid_recall)
        if valid_recall
        else 0.0
    )

    # --------------------------------------------------
    # Quality Metric Averages
    # --------------------------------------------------

    avg_context_relevance = (
        sum(
            r["context_relevance"]
            for r in all_results
        )
        / len(all_results)
    )

    avg_answer_correctness = (
        sum(
            r["answer_correctness"]
            for r in all_results
        )
        / len(all_results)
    )

    avg_faithfulness = (
        sum(
            r["faithfulness"]
            for r in all_results
        )
        / len(all_results)
    )

    # --------------------------------------------------
    # Latency
    # --------------------------------------------------

    avg_latency = (
        sum(
            r["latency_seconds"]
            for r in all_results
        )
        / len(all_results)
    )

    # --------------------------------------------------
    # Retrieval Attempts
    # --------------------------------------------------

    total_attempts = sum(
        r["retrieval_attempts"]
        for r in all_results
    )

    avg_attempts = (
        total_attempts / len(all_results)
    )

    # --------------------------------------------------
    # Rewrite Metrics
    # --------------------------------------------------

    rewrite_results = [
        r
        for r in all_results
        if r["rewrite_triggered"]
    ]

    rewrite_count = len(rewrite_results)

    # A rewrite is counted as retrieval-successful when
    # the final retrieval becomes sufficient.
    successful_rewrites = sum(
        1
        for r in rewrite_results
        if r["quality_sufficient"]
    )

    rewrite_success_rate = (
        successful_rewrites / rewrite_count
        if rewrite_count > 0
        else 0.0
    )

    # --------------------------------------------------
    # Retrieval Failure Rate
    # --------------------------------------------------
    #
    # Calculated only on answerable test cases where
    # relevant ground-truth chunks exist.
    #
    # A failure means the system failed to retrieve
    # at least one required relevant chunk.
    # --------------------------------------------------

    answerable_results = [
        r
        for r in all_results
        if r["relevant_ids"]
    ]

    retrieval_failures = sum(
        1
        for r in answerable_results
        if r["retrieval_recall"] < 1.0
    )

    retrieval_failure_rate = (
        retrieval_failures / len(answerable_results)
        if answerable_results
        else 0.0
    )

    # --------------------------------------------------
    # Build Summary
    # --------------------------------------------------

    summary = {
        "total_test_cases": len(all_results),

        "average_precision_at_k": avg_precision,
        "average_retrieval_recall": avg_recall,

        "average_context_relevance": (
            avg_context_relevance
        ),

        "average_answer_correctness": (
            avg_answer_correctness
        ),

        "average_faithfulness": (
            avg_faithfulness
        ),

        "retrieval_failure_rate": (
            retrieval_failure_rate
        ),

        "retrieval_failures": (
            retrieval_failures
        ),

        "answerable_test_cases": (
            len(answerable_results)
        ),

        "query_rewriting_success_rate": (
            rewrite_success_rate
        ),

        "successful_rewrites": (
            successful_rewrites
        ),

        "queries_triggering_rewrite": (
            rewrite_count
        ),

        "average_retrieval_attempts": (
            avg_attempts
        ),

        "total_retrieval_attempts": (
            total_attempts
        ),

        "average_latency_seconds": (
            avg_latency
        ),
    }

    # --------------------------------------------------
    # Print Final Summary
    # --------------------------------------------------

    print(f"\nTotal Test Cases: {len(all_results)}")

    print(
        f"Average Precision@K: "
        f"{avg_precision:.3f}"
    )

    print(
        f"Average Retrieval Recall: "
        f"{avg_recall:.3f}"
    )

    print(
        f"Average Context Relevance: "
        f"{avg_context_relevance:.3f}"
    )

    print(
        f"Average Answer Correctness: "
        f"{avg_answer_correctness:.3f}"
    )

    print(
        f"Average Faithfulness / Groundedness: "
        f"{avg_faithfulness:.3f}"
    )

    print(
        f"Retrieval Failure Rate: "
        f"{retrieval_failure_rate:.3f} "
        f"({retrieval_failures}/"
        f"{len(answerable_results)} answerable cases)"
    )

    print(
        f"Query-Rewriting Success Rate: "
        f"{rewrite_success_rate:.3f} "
        f"({successful_rewrites}/{rewrite_count})"
    )

    print(
        f"Average Retrieval Attempts: "
        f"{avg_attempts:.2f}"
    )

    print(
        f"Total Retrieval Attempts: "
        f"{total_attempts}"
    )

    print(
        f"Queries Triggering Rewrite: "
        f"{rewrite_count}"
    )

    print(
        f"Average Latency: "
        f"{avg_latency:.2f} seconds"
    )

    # --------------------------------------------------
    # Save Evaluation Results to JSON
    # --------------------------------------------------

    output_data = {
        "summary": summary,
        "results": all_results,
    }

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            output_data,
            file,
            indent=4,
            ensure_ascii=False
        )

    print(
        f"\nEvaluation results saved to: "
        f"{OUTPUT_FILE}"
    )
    return output_data


if __name__ == "__main__":
    run_adaptive_evaluation()