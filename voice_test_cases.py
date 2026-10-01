"""Required live-demo scenarios for the Voice RAG task."""


VOICE_TEST_CASES = [
    {
        "id": 1,
        "scenario": "Normal Arabic voice question",
        "utterance": "ما هي فوائد اليوغا الصحية؟",
        "expected": (
            "Arabic is detected, a grounded Arabic answer is shown and spoken."
        )
    },
    {
        "id": 2,
        "scenario": "Normal English voice question",
        "utterance": "What are the health benefits of yoga?",
        "expected": (
            "English is detected, a grounded English answer is shown and spoken."
        )
    },
    {
        "id": 3,
        "scenario": "Arabic follow-up question",
        "utterance": "وماذا عن تأثيرها على التوتر؟",
        "expected": (
            "The agent uses conversation history, resolves the reference, "
            "and replies in Arabic."
        )
    },
    {
        "id": 4,
        "scenario": "English follow-up question",
        "utterance": "And how does it help with sleep?",
        "expected": (
            "The agent uses the preceding turn and replies in English."
        )
    },
    {
        "id": 5,
        "scenario": "Interrupt the agent while speaking",
        "utterance": "Wait, tell me about breathing instead.",
        "expected": (
            "Current audio stops immediately and the new utterance is processed."
        )
    },
    {
        "id": 6,
        "scenario": "Multiple interruptions",
        "utterance": (
            "Interrupt two consecutive spoken answers with new questions."
        ),
        "expected": (
            "Each answer stops and only the newest turn is spoken."
        )
    },
    {
        "id": 7,
        "scenario": "Missing knowledge",
        "utterance": "What is the company's annual leave policy?",
        "expected": (
            "The agent clearly says that the information is unavailable "
            "and invents nothing."
        )
    },
    {
        "id": 8,
        "scenario": "Interrupt and switch language",
        "utterance": (
            "Interrupt a long English answer with: "
            "ما هي فوائد شاي المورينغا؟"
        ),
        "expected": (
            "English audio stops, Arabic is detected, and the new answer "
            "is spoken in Arabic."
        )
    }
]
