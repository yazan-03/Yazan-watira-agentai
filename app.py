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
            "error": "Something went wrong while processing your question."
        }), 500


@app.route("/evaluate", methods=["POST"])
def evaluate():
    try:
        results = run_evaluation()

        return jsonify(results)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True , use_reloader=False)