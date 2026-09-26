import json
import os

from flask import Flask, render_template, request, jsonify

from agent_service import run_agent
from evaluate_rag import run_evaluation


app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()

    question = data.get("message", "").strip()

    if not question:
        return jsonify({
            "error": "Please enter a question."
        }), 400

    try:
        result = run_agent(question)

        return jsonify({
            "answer": result["answer"],
            "tool_trace": result["tool_trace"],
            "sources": result["sources"],
            "ranking": result["ranking"]
        })

    except Exception as e:

        print(f"Error: {e}")

        return jsonify({
            "error": (
                "Something went wrong while "
                "processing your question."
            )
        }), 500


# ==================================================
# OLD RAG EVALUATION
# ==================================================

@app.route("/evaluate", methods=["POST"])
def evaluate():

    try:
        results = run_evaluation()

        return jsonify(results)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# ==================================================
# ADAPTIVE RAG EVALUATION
# ==================================================


# --------------------------------------------------
# GET: Load the last saved evaluation results
# Does NOT run the evaluation
# --------------------------------------------------

@app.route("/adaptive-evaluation", methods=["GET"])
def adaptive_evaluation():

    try:

        file_path = os.path.join(
            app.root_path,
            "evaluation_results.json"
        )

        if not os.path.exists(file_path):

            return jsonify({
                "error": (
                    "Adaptive RAG evaluation results "
                    "were not found."
                )
            }), 404

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as file:

            results = json.load(file)

        return jsonify(results)

    except Exception as e:

        print(
            f"Adaptive evaluation load error: {e}"
        )

        return jsonify({
            "error": str(e)
        }), 500


# --------------------------------------------------
# POST: Run a NEW Adaptive RAG evaluation
# --------------------------------------------------

@app.route("/run-adaptive-evaluation", methods=["POST"])
def run_adaptive_evaluation_endpoint():

    try:

        # Import only when Run button is clicked
        from evaluate_adaptive_rag import run_adaptive_evaluation

        results = run_adaptive_evaluation()

        return jsonify(results)

    except Exception as e:

        print(
            f"Adaptive evaluation run error: {e}"
        )

        return jsonify({
            "error": str(e)
        }), 500
if __name__ == "__main__":
    app.run(
        debug=True,
        use_reloader=False
    )