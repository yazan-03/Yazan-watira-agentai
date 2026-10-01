import os

from dotenv import load_dotenv
from openai import AzureOpenAI
from trulens.providers.openai import AzureOpenAI as TruLensAzureOpenAI
from tools import rag_search


# ==========================================
# ENVIRONMENT
# ==========================================

load_dotenv()

os.environ["AZURE_OPENAI_API_KEY"] = os.getenv("AZURE_OPENAI_KEY")
os.environ["OPENAI_API_VERSION"] = "2024-02-01"


# ==========================================
# AZURE OPENAI CLIENT
# ==========================================

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-02-01"
)

GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


# ==========================================
# TRULENS JUDGE
# ==========================================

judge = TruLensAzureOpenAI(
    deployment_name=GPT_DEPLOYMENT
)


# ==========================================
# RUN STANDARD RAG
# ==========================================

def run_rag(question):

    # 1. Retrieve relevant chunks
    search_results = rag_search(question)

    # 2. Combine retrieved chunks into one context
    context = "\n\n".join(
        result["content"]
        for result in search_results
    )

    # 3. Generate grounded answer
    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=[
            {
                "role": "system",
                "content": """
You are a helpful AI assistant.

Answer the question using ONLY the provided context.

If the context contains only part of the answer, answer only
the supported part and clearly state what could not be found.

If the context does not contain the answer, say:
"I could not find this information in the provided documents."

Do not use outside knowledge or make assumptions.
"""
            },
            {
                "role": "user",
                "content": f"""
Context:

{context}

Question:

{question}
"""
            }
        ]
    )

    answer = response.choices[0].message.content

    return {
        "question": question,
        "context": context,
        "contexts": search_results,
        "answer": answer
    }


# ==========================================
# RUN RAG TRIAD EVALUATION
# ==========================================

def run_evaluation():

    test_cases = [
        "I want to reduce stress and improve flexibility. How can yoga help me, and how should I start practicing at home?",

        "What happens during training that does not happen during inference, and why does the model's behavior differ between them?",

        "What are the health benefits of moringa tea, and how should I prepare it without damaging its nutrients?",

        "I am completely new to gardening. What plants should I start with, how should I water them, and what basic tools will I need?",

        "Why can Italian coffee be considered a cultural and social ritual rather than simply a caffeinated drink?",

        "Compare yoga and swimming for improving flexibility and reducing stress. Which benefits does each one provide?",

        "Compare yoga and gardening as activities for someone looking for a mindful daily routine. What does the knowledge base say about each?",

        "How can I improve my cybersecurity and protect my computer from ransomware?"
    ]

    evaluation_results = []


    # ======================================
    # EVALUATE EACH TEST CASE
    # ======================================

    for test_number, question in enumerate(
        test_cases,
        start=1
    ):

        print("\n" + "=" * 70)
        print(f"TEST CASE {test_number}")
        print("=" * 70)
        print(f"Question: {question}")


        # ----------------------------------
        # Run RAG
        # ----------------------------------

        result = run_rag(question)


        # ----------------------------------
        # Context Relevance
        # ----------------------------------

        context_scores = []

        for chunk in result["contexts"]:

            score = judge.context_relevance(
                question=result["question"],
                context=chunk["content"]
            )

            context_scores.append(score)


        if context_scores:

            average_context_relevance = (
                sum(context_scores)
                / len(context_scores)
            )

        else:

            average_context_relevance = 0.0


        # ----------------------------------
        # Groundedness
        # ----------------------------------

        groundedness_result = (
            judge.groundedness_measure_with_cot_reasons(
                source=result["context"],
                statement=result["answer"]
            )
        )

        groundedness_score = groundedness_result[0]


        # ----------------------------------
        # Answer Relevance
        # ----------------------------------

        answer_relevance_result = (
            judge.relevance_with_cot_reasons(
                prompt=result["question"],
                response=result["answer"]
            )
        )

        answer_relevance_score = (
            answer_relevance_result[0]
        )


        # ----------------------------------
        # Build Chunk Details
        # ----------------------------------

        chunk_details = []

        for chunk, chunk_score in zip(
            result["contexts"],
            context_scores
        ):

            chunk_details.append({
                "source": chunk.get(
                    "source",
                    "Unknown source"
                ),

                "id": chunk.get(
                    "id",
                    "Unknown chunk"
                ),

                "content": chunk.get(
                    "content",
                    ""
                ),

                "context_relevance": chunk_score,

                "hybrid_score": chunk.get(
                    "hybrid_score"
                ),

                "semantic_score": chunk.get(
                    "semantic_score"
                )
            })


        # ----------------------------------
        # Store Test Result
        # ----------------------------------

        evaluation_results.append({

            "test": test_number,

            "question": question,

            "answer": result["answer"],

            "context_relevance":
                average_context_relevance,

            "groundedness":
                groundedness_score,

            "answer_relevance":
                answer_relevance_score,

            "chunks":
                chunk_details
        })


        # ----------------------------------
        # Terminal Output
        # ----------------------------------

        print("\nAnswer:")
        print(result["answer"])

        print("\nContext Relevance per Chunk:")

        for chunk_number, score in enumerate(
            context_scores,
            start=1
        ):

            print(
                f"  Chunk {chunk_number}: "
                f"{score:.3f}"
            )

        print(
            "\nAverage Context Relevance: "
            f"{average_context_relevance:.3f}"
        )

        print(
            "Groundedness: "
            f"{groundedness_score:.3f}"
        )

        print(
            "Answer Relevance: "
            f"{answer_relevance_score:.3f}"
        )


    # ======================================
    # OVERALL AVERAGES
    # ======================================

    avg_context = sum(
        item["context_relevance"]
        for item in evaluation_results
    ) / len(evaluation_results)


    avg_groundedness = sum(
        item["groundedness"]
        for item in evaluation_results
    ) / len(evaluation_results)


    avg_answer_relevance = sum(
        item["answer_relevance"]
        for item in evaluation_results
    ) / len(evaluation_results)


    # ======================================
    # TERMINAL SUMMARY
    # ======================================

    print("\n\n" + "=" * 90)
    print("RAG TRIAD EVALUATION SUMMARY")
    print("=" * 90)

    print(
        f"{'Test':<6}"
        f"{'Context Relevance':<22}"
        f"{'Groundedness':<18}"
        f"{'Answer Relevance':<20}"
    )

    print("-" * 66)


    for item in evaluation_results:

        print(
            f"{item['test']:<6}"
            f"{item['context_relevance']:<22.3f}"
            f"{item['groundedness']:<18.3f}"
            f"{item['answer_relevance']:<20.3f}"
        )


    print("-" * 66)

    print(
        f"{'AVG':<6}"
        f"{avg_context:<22.3f}"
        f"{avg_groundedness:<18.3f}"
        f"{avg_answer_relevance:<20.3f}"
    )


    # ======================================
    # RETURN RESULTS TO FLASK / WEBSITE
    # ======================================

    return {

        "results": evaluation_results,

        "averages": {

            "context_relevance":
                avg_context,

            "groundedness":
                avg_groundedness,

            "answer_relevance":
                avg_answer_relevance
        }
    }


# ==========================================
# RUN DIRECTLY FROM TERMINAL
# ==========================================

if __name__ == "__main__":
    run_evaluation()