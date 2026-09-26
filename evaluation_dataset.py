TEST_CASES = [
    {
        "id": 1,
        "type": "simple_factual",
        "query": "What are the health benefits of yoga?",
        "expected_information": (
            "Yoga can improve flexibility and posture, reduce stress, "
            "support sleep, and improve body awareness."
        ),
        "relevant_chunk_ids": [
            "5_Introduction_to_Yoga-0",
            "5_Introduction_to_Yoga-1",
        ],
    },

    {
        "id": 2,
        "type": "ambiguous",
        "query": "How should I prepare it at home?",
        "expected_information": (
            "The question is ambiguous because 'it' does not identify "
            "what the user wants to prepare. The system should not assume "
            "a specific item from the knowledge base."
        ),
        "relevant_chunk_ids": [],
    },

    {
        "id": 3,
        "type": "query_rewriting",
        "query": (
            "My plant looks like I may be caring for it too much. "
            "How can I know if I should wait before doing it again?"
        ),
        "expected_information": (
            "How to determine whether a plant needs watering "
            "and avoid overwatering."
        ),
        "relevant_chunk_ids": [
            "3_Beginners_Guide_to_Gardening-1"
        ],
    },

    {
        "id": 4,
        "type": "alternative_retrieval",
        "query": "What does the guide say about Moka Pot brewing steps and the safety valve?",
        "expected_information": (
            "Fill the bottom chamber with cold water up to the safety valve, "
            "add medium-ground coffee without pressing it down, screw on the "
            "top chamber, and heat on a low flame until coffee fills the upper pot."
        ),
        "relevant_chunk_ids": [
            "4_Italian_Coffee_Culture-0",
        ],
    },

    {
        "id": 5,
        "type": "multiple_documents",
        "query": "Compare the health benefits of yoga and moringa tea.",
        "expected_information": (
            "The answer should compare yoga benefits with moringa tea benefits "
            "using evidence from both the Yoga and Moringa documents."
        ),
        "relevant_chunk_ids": [
            "5_Introduction_to_Yoga-0",
            "5_Introduction_to_Yoga-1",
            "1_Moringa_Tea_Health_Guide-0",
        ],
    },

    {
        "id": 6,
        "type": "multi_hop",
        "query": "How can yoga help with stress, and what caffeine-free drink could support energy?",
        "expected_information": (
            "Yoga can help reduce stress, including through lower cortisol "
            "and conscious breathing. Moringa tea is a caffeine-free drink "
            "described as supporting energy."
        ),
        "relevant_chunk_ids": [
            "5_Introduction_to_Yoga-0",
            "1_Moringa_Tea_Health_Guide-0",
        ],
    },

    {
        "id": 7,
        "type": "missing_knowledge",
        "query": "What is the company's annual leave policy?",
        "expected_information": (
            "The knowledge base does not contain the company's annual leave "
            "policy, so the system should clearly state that it cannot find "
            "enough information."
        ),
        "relevant_chunk_ids": [],
    },

    {
        "id": 8,
        "type": "noisy_wording",
        "query": (
            "umm like if im new to plants and keep giving them water a lot lol "
            "how do i know if they actually need it"
        ),
        "expected_information": (
            "Check soil moisture by inserting a finger about 1 inch into the soil. "
            "The guide also warns that overwatering is a common beginner mistake."
        ),
        "relevant_chunk_ids": [
            "3_Beginners_Guide_to_Gardening-1",
        ],
    },
]