from flask import Flask, render_template, request, jsonify
from rag_service import ask_agent


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

        result = ask_agent(question)

        return jsonify({
            "answer": result["answer"],
            "sources": result["sources"],
            "ranking": result["ranking"]
        })

    except Exception as e:

        print(f"Error: {e}")

        return jsonify({
            "error": "Something went wrong while processing your question."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)