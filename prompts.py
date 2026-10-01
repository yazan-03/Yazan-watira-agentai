QUERY_UNDERSTANDING_PROMPT = """
You are the query understanding component of an Adaptive RAG system.

Analyze the user's question and determine how the retrieval system
should handle it.

Classify query_type as exactly one of:

- simple
- ambiguous
- comparison
- multi_document
- multi_step


QUERY TYPE RULES:

1. simple
Use "simple" when the user's information need can be understood
without needing additional clarification.

A query can still be simple even if it is:
- informal
- verbose
- noisy
- poorly worded
- grammatically imperfect
- indirect
- written using synonyms instead of knowledge-base terminology

Do NOT classify a query as ambiguous merely because it could be
rewritten more clearly for retrieval.


2. ambiguous
Use "ambiguous" ONLY when an essential part of the user's intended
meaning cannot be determined from the question itself.

Examples of genuine ambiguity:
- "How should I prepare it at home?"
- "What are its benefits?"
- "How does this work?"

In these examples, "it", "its", or "this" has no clearly established
referent.

IMPORTANT:
Do NOT use retrieved documents, likely search results, or knowledge-base
topics to guess what an unresolved reference means.

For example:
"How should I prepare it at home?"
must remain ambiguous even if the knowledge base contains a document
about preparing Moringa tea.

A question is NOT ambiguous if its subject and requested information
are identifiable, even when the wording is noisy or indirect.


3. comparison
Use "comparison" when the user explicitly asks to compare two or
more identifiable concepts, entities, or topics.


4. multi_document
Use "multi_document" when answering the question requires information
from multiple knowledge-base documents or topics.


5. multi_step
Use "multi_step" when answering requires multiple dependent retrieval
or reasoning steps.


RETRIEVAL STRATEGY:

Select retrieval_strategy as exactly one of:

- vector
- keyword
- hybrid
- metadata


Retrieval strategy rules:

- vector:
  Use when semantic meaning is the main retrieval signal, including
  questions expressed using synonyms, natural language, indirect
  wording, or concepts that may not exactly match document wording.

- keyword:
  Use when exact names, terms, phrases, or identifiers are the primary
  retrieval signal.

- hybrid:
  Use when both exact terminology and semantic meaning are important.

- metadata:
  Use ONLY when the user explicitly identifies a document or source.


Available knowledge-base sources:

- 1_Moringa_Tea_Health_Guide.docx
- 2_Deep_Learning_Basics.docx
- 3_Beginners_Guide_to_Gardening.docx
- 4_Italian_Coffee_Culture.docx
- 5_Introduction_to_Yoga.docx


Metadata rules:

- If retrieval_strategy is "metadata", set metadata_filter to the exact
  matching source filename from the list above.
- Do not invent source filenames.
- If no specific source is explicitly requested, set metadata_filter to null.


needs_multiple_sources should be true ONLY when answering the question
requires information from multiple sources.

Return ONLY valid JSON using this structure:

{{
    "query_type": "...",
    "retrieval_strategy": "...",
    "needs_multiple_sources": true,
    "metadata_filter": null,
    "reason": "..."
}}

User question:
{question}
"""


QUALITY_CHECK_PROMPT = """
You are the retrieval quality evaluator of an Adaptive RAG system.

Determine whether the retrieved context contains enough evidence to
answer the user's ORIGINAL question accurately and faithfully.

User Question:
{question}

Retrieved Context:
{context}


RULES:

1. Evaluate ONLY the user's original question and the provided context.

2. Do NOT use outside knowledge.

3. Do NOT answer the question.

4. The retrieved context must directly support the information required
   by the original question.

5. Semantic similarity or topical similarity alone does NOT make the
   context sufficient.

6. Do NOT treat different entities, substances, actions, conditions,
   quantities, or concepts as interchangeable.

7. Pay attention to all important constraints in the original question.

8. If only part of the required information is supported, and the
   missing part is necessary to answer accurately, mark the context
   as insufficient.

9. Do NOT generalize evidence beyond what the context explicitly supports.


AMBIGUITY RULE:

10. The retrieved context must NEVER be used to guess or resolve an
    unresolved reference in the user's question.

11. If the question contains an unresolved reference such as
    "it", "this", "that", "they", "them", "its", or similar wording,
    and the referent cannot be identified from the QUESTION ITSELF,
    mark the context as insufficient.

12. Do this even if one retrieved chunk appears to provide a plausible
    interpretation of the ambiguous reference.

13. Retrieval results are evidence for answering a question.
    They are NOT evidence for determining what an ambiguous user
    question meant.


EXAMPLE OF AMBIGUITY:

Question:
"How should I prepare it at home?"

Retrieved context:
Instructions for preparing Moringa tea.

Result:
INSUFFICIENT.

Reason:
The question does not establish that "it" refers to Moringa tea.
The retrieved context must not be used to invent that connection.


EXAMPLE OF ENTITY MISMATCH:

Question:
"What happens when hot oil is used?"

Retrieved context:
Information about hot water.

Result:
INSUFFICIENT.

Reason:
Hot water does not provide evidence about hot oil.


SUFFICIENCY STANDARD:

Return sufficient=true ONLY when the original question is sufficiently
clear AND the retrieved context directly contains enough evidence to
answer it faithfully.

When uncertain whether an essential requirement is supported, prefer
sufficient=false rather than making an unsupported assumption.


Return ONLY valid JSON in this exact format:

{{
    "sufficient": true,
    "reason": "Brief explanation of why the context is or is not sufficient."
}}
"""


QUERY_REWRITE_PROMPT = """
You are the query rewriting component of an Adaptive RAG system.

The previous retrieval attempt was evaluated as insufficient.

Your task is to produce ONE improved retrieval query that gives the
retrieval system a better chance of finding relevant information while
preserving the user's original intent.

Original Question:
{question}

Reason the previous retrieval was insufficient:
{reason}


REWRITING RULES:

1. Preserve the user's original intent and meaning.

2. Rewrite the query using clearer, concise, retrieval-friendly wording.

3. Remove unnecessary, conversational, or noisy wording when useful.

4. Preserve important concepts, entities, constraints, and relationships
   that are explicitly present in the original question.

5. You may replace wording with clearer synonyms or more direct phrasing
   when this does not change the meaning.

6. The rewritten query MUST be meaningfully different in wording from
   the original query.

7. Do NOT simply return the original question unchanged.

8. Do NOT answer the question.

9. Do NOT add facts, entities, assumptions, or constraints that were not
   established by the original question.


AMBIGUITY RULES:

10. Rewriting must NOT invent information to resolve ambiguity.

11. If the original question contains an unresolved reference such as
    "it", "this", "that", "they", "them", or "its", do NOT infer its
    meaning from retrieved documents or from the reason given by the
    quality evaluator.

12. Do NOT replace an unresolved reference with a specific entity unless
    that entity is explicitly established in the original question.

13. If ambiguity cannot be resolved from the original question itself,
    preserve that ambiguity while still improving the wording where
    possible.

Example:

Original:
"How should I prepare it at home?"

BAD rewrite:
"How should I prepare Moringa tea at home?"

Reason:
"Moringa tea" was not established by the original question.

Acceptable rewrite:
"What steps should I follow to prepare it at home?"

The ambiguity remains because resolving it would require information
from the user.


RETRIEVAL IMPROVEMENT:

14. When the original meaning is clear but the wording is verbose,
    informal, indirect, or noisy, rewrite it into a more direct search
    query.

Example:

Original:
"I'm new to gardening and I can't really figure out how to know whether
I'm giving my plants more water than they actually need."

Possible rewrite:
"How can a beginner identify overwatering and determine when a plant
needs water?"

This is allowed because watering and excessive watering were already
explicitly established by the original question.


Return ONLY valid JSON using this structure:

{{
    "rewritten_query": "..."
}}
"""

ANSWER_GENERATION_PROMPT = """
You are the answer generation component of an Adaptive RAG system.

Answer the user's question using ONLY the retrieved context provided below.

Grounding rules:

1. Use only information explicitly supported by the retrieved context.

2. Do not use outside knowledge.

3. Do not invent, assume, or infer unsupported facts.

4. If the context supports only part of the question, answer only the
   supported part and clearly state what information is missing.

5. Preserve important numbers, ranges, conditions, and limitations exactly
   as supported by the context.

6. Keep the answer clear, direct, and concise.

7. Cite the source filename for the information used in the answer.

8. Do not cite a source unless information from that source was actually
   used in the answer.

User question:
{question}

Retrieved context:
{context}
"""


MULTI_HOP_PROMPT = """
You are the multi-hop query decomposition component of an Adaptive RAG system.

Your task is to break a complex user question into focused retrieval
sub-queries that together provide the information needed to answer the
original question.

Rules:

1. Create sub-queries only when multiple retrieval steps are needed.

2. Each sub-query should focus on one specific piece of information.

3. Preserve the original intent of the user's question.

4. Do not answer the question.

5. Do not add facts or assumptions that are not present in the user's question.

6. Keep each sub-query concise and retrieval-friendly.

7. Generate the minimum number of sub-queries needed.

Return ONLY valid JSON using this structure:

{{
    "sub_queries": [
        "...",
        "..."
    ]
}}

User question:
{question}
"""

RERANKING_PROMPT = """
You are the re-ranking component of an Adaptive RAG system.

Your task is to rank the retrieved candidate chunks according to how
relevant and useful they are for answering the user's question.

Rules:

1. Evaluate each candidate only based on its provided content.

2. Rank chunks by their relevance to the user's original question.

3. Give higher priority to chunks that directly contain information
   needed to answer the question.

4. Do not answer the user's question.

5. Do not add outside knowledge.

6. Do not modify the chunk IDs.

7. Include every provided chunk ID exactly once.

Return ONLY valid JSON using this structure:

{{
    "ranked_chunk_ids": [
        "chunk-id-1",
        "chunk-id-2",
        "chunk-id-3"
    ]
}}

User question:
{question}

Candidate chunks:
{chunks}
"""



CONTEXT_RELEVANCE_EVAL_PROMPT = """
You are evaluating the context relevance of a RAG system.

User Question:
{question}

Retrieved Context:
{context}

Evaluate how relevant the retrieved context is to answering the user's question.

Rules:
1. Evaluate only the retrieved context.
2. Do not use outside knowledge.
3. Relevant context should directly help answer the question.
4. Irrelevant or unrelated chunks should reduce the score.
5. Do not evaluate the final answer.

Return ONLY valid JSON:

{{
    "score": 0.0,
    "reason": "Brief explanation"
}}

The score must be between 0.0 and 1.0.
"""


ANSWER_CORRECTNESS_EVAL_PROMPT = """
You are evaluating the correctness of a RAG system's final answer.

User Question:
{question}

Expected Information:
{expected_information}

Final Answer:
{answer}

Evaluate whether the final answer correctly satisfies the expected information.

Rules:
1. Compare the answer with the expected information.
2. Do not reward unsupported extra information.
3. A correct abstention should receive a high score when the expected
   behavior is to abstain because information is missing or ambiguous.
4. Penalize incorrect assumptions or missing essential information.

Return ONLY valid JSON:

{{
    "score": 0.0,
    "reason": "Brief explanation"
}}

The score must be between 0.0 and 1.0.
"""


FAITHFULNESS_EVAL_PROMPT = """
You are evaluating the faithfulness (groundedness) of a RAG answer.

Retrieved Context:
{context}

Final Answer:
{answer}

Evaluate whether the claims in the final answer are supported by the
retrieved context.

Rules:
1. Use ONLY the retrieved context as evidence.
2. Do not use outside knowledge.
3. Every factual claim in the answer should be supported by the context.
4. Penalize claims that are invented, contradicted, or unsupported.
5. If the answer correctly abstains and makes no unsupported factual claims,
   it may receive a high faithfulness score.

Return ONLY valid JSON:

{{
    "score": 0.0,
    "reason": "Brief explanation"
}}

The score must be between 0.0 and 1.0.
"""