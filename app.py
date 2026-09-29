import json
import os
import urllib.error
import urllib.request

from flask import Flask, render_template, request, jsonify

from agent_service import run_agent
from evaluate_rag import run_evaluation


app = Flask(__name__)


VOICE_TEST_CASES = [
    {
        "id": 1,
        "scenario": "Normal Arabic voice question",
        "utterance": "ما هي فوائد اليوغا الصحية؟",
        "expected": "Arabic is detected, a grounded Arabic answer is shown and spoken."
    },
    {
        "id": 2,
        "scenario": "Normal English voice question",
        "utterance": "What are the health benefits of yoga?",
        "expected": "English is detected, a grounded English answer is shown and spoken."
    },
    {
        "id": 3,
        "scenario": "Arabic follow-up question",
        "utterance": "وماذا عن تأثيرها على التوتر؟",
        "expected": "The agent uses conversation history, resolves the reference, and replies in Arabic."
    },
    {
        "id": 4,
        "scenario": "English follow-up question",
        "utterance": "And how does it help with sleep?",
        "expected": "The agent uses the preceding turn and replies in English."
    },
    {
        "id": 5,
        "scenario": "Interrupt the agent while speaking",
        "utterance": "Wait, tell me about breathing instead.",
        "expected": "Current audio stops immediately and the new utterance is processed."
    },
    {
        "id": 6,
        "scenario": "Multiple interruptions",
        "utterance": "Interrupt two consecutive spoken answers with new questions.",
        "expected": "Each answer stops and only the newest turn is spoken."
    },
    {
        "id": 7,
        "scenario": "Missing knowledge",
        "utterance": "What is the company's annual leave policy?",
        "expected": "The agent clearly says that the information is unavailable and invents nothing."
    },
    {
        "id": 8,
        "scenario": "Interrupt and switch language",
        "utterance": "Interrupt a long English answer with: ما هي فوائد شاي المورينغا؟",
        "expected": "English audio stops, Arabic is detected, and the new answer is spoken in Arabic."
    }
]


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
# VOICE RAG AGENT
# ==================================================

@app.route("/speech-token", methods=["GET"])
def speech_token():
    """Exchange the server-side Speech key for a short-lived browser token."""

    speech_key = os.getenv("AZURE_SPEECH_KEY")
    speech_region = os.getenv("AZURE_SPEECH_REGION")

    if not speech_key or not speech_region:
        return jsonify({
            "error": (
                "Azure Speech is not configured. Set AZURE_SPEECH_KEY "
                "and AZURE_SPEECH_REGION in .env."
            )
        }), 503

    token_url = (
        f"https://{speech_region}.api.cognitive.microsoft.com/"
        "sts/v1.0/issueToken"
    )

    token_request = urllib.request.Request(
        token_url,
        data=b"",
        method="POST",
        headers={
            "Ocp-Apim-Subscription-Key": speech_key,
            "Content-Length": "0"
        }
    )

    try:
        with urllib.request.urlopen(token_request, timeout=10) as response:
            token = response.read().decode("utf-8")

        return jsonify({
            "token": token,
            "region": speech_region
        })

    except (urllib.error.URLError, TimeoutError) as error:
        print(f"Speech token error: {error}")
        return jsonify({
            "error": "Could not connect to Azure Speech."
        }), 502


@app.route("/voice-chat", methods=["POST"])
def voice_chat():
    data = request.get_json(silent=True) or {}
    question = str(data.get("message", "")).strip()
    language = data.get("language")
    history = data.get("history", [])

    if not question:
        return jsonify({"error": "No speech was recognized."}), 400

    if language not in {"ar-JO", "en-US"}:
        language = "ar-JO" if any(
            "\u0600" <= character <= "\u06ff"
            for character in question
        ) else "en-US"

    if not isinstance(history, list):
        history = []

    try:
        result = run_agent(
            question,
            conversation_history=history,
            response_language=language
        )

        return jsonify({
            "answer": result["answer"],
            "language": language,
            "sources": result["sources"],
            "tool_trace": result["tool_trace"]
        })

    except Exception as error:
        print(f"Voice agent error: {error}")
        message = (
            "حدث خطأ أثناء معالجة سؤالك."
            if language == "ar-JO"
            else "Something went wrong while processing your question."
        )
        return jsonify({"error": message}), 500


@app.route("/voice-test-cases", methods=["GET"])
def voice_test_cases():
    return jsonify({"test_cases": VOICE_TEST_CASES})


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
