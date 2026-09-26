// ==========================================
// DOM ELEMENTS
// ==========================================


const runAdaptiveEvaluationButton =
    document.getElementById(
        "run-adaptive-evaluation-button"
    );
const assistantButton = document.getElementById("assistant-button");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const inputWrapper = document.getElementById("chat-input-wrapper");

const evaluationButton = document.getElementById("evaluation-button");
const evaluationPanel = document.getElementById("evaluation-panel");
const runEvaluationButton = document.getElementById("run-evaluation-button");

const adaptiveEvaluationButton =
    document.getElementById("adaptive-evaluation-button");

const adaptiveEvaluationPanel =
    document.getElementById("adaptive-evaluation-panel");

const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");


// ==========================================
// CHAT
// ==========================================

async function sendMessage() {

    const message = input.value.trim();

    if (!message) {
        return;
    }


    // Remove welcome screen
    const welcome = document.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }


    // Show user message
    addMessage(message, "user");

    input.value = "";
    autoResizeTextarea();

    sendButton.disabled = true;


    // Show loading indicator
    const loadingRow = document.createElement("div");
    loadingRow.className = "message-row bot";

    const loadingMessage = document.createElement("div");
    loadingMessage.className = "message";

    loadingMessage.innerHTML = `
        <div class="typing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    loadingRow.appendChild(loadingMessage);
    chatBox.appendChild(loadingRow);

    scrollToBottom();


    try {

        const response = await fetch("/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message
            })
        });


        const data = await response.json();

        loadingRow.remove();


        if (!response.ok) {
            throw new Error(
                data.error || "Something went wrong."
            );
        }


        // Final agent answer
        if (data.answer) {
            addMessage(data.answer, "bot");
        }


        // Tool Trace
        if (
            Array.isArray(data.tool_trace) &&
            data.tool_trace.length > 0
        ) {
            addToolTrace(data.tool_trace);
        }


        // Retrieval information
        if (
            Array.isArray(data.sources) &&
            data.sources.length > 0
        ) {
            addRetrievalPanel(
                data.sources,
                data.ranking || []
            );
        }


    } catch (error) {

        loadingRow.remove();

        addMessage(
            `Error: ${error.message}`,
            "bot"
        );

    } finally {

        sendButton.disabled = false;
        input.focus();
    }
}


// ==========================================
// ADD MESSAGE
// ==========================================

function addMessage(text, type) {

    const row = document.createElement("div");

    row.className = `message-row ${type}`;


    const message = document.createElement("div");

    message.className = "message";
    message.textContent = text;


    row.appendChild(message);

    chatBox.appendChild(row);

    scrollToBottom();
}


// ==========================================
// RETRIEVAL PANEL
// ==========================================

function addRetrievalPanel(sources, ranking) {

    const panelRow = document.createElement("div");

    panelRow.className = "message-row bot";


    const panel = document.createElement("div");

    panel.className = "retrieval-panel";


    // Sources
    const sourcesSection = document.createElement("div");

    sourcesSection.className = "retrieval-section";


    const sourceTitle = document.createElement("div");

    sourceTitle.className = "retrieval-title";

    sourceTitle.innerHTML = `
        Retrieved Sources
        <span class="semantic-badge">
            Hybrid + Semantic
        </span>
    `;

    sourcesSection.appendChild(sourceTitle);


    sources.forEach((source) => {

        const sourceItem = document.createElement("div");

        sourceItem.className = "source-item";

        sourceItem.innerHTML = `
            <span class="file-icon">DOC</span>
            <span>${escapeHTML(source)}</span>
        `;

        sourcesSection.appendChild(sourceItem);
    });


    panel.appendChild(sourcesSection);


    // Ranking
    if (
        Array.isArray(ranking) &&
        ranking.length > 0
    ) {

        const rankingSection = document.createElement("div");

        rankingSection.className =
            "retrieval-section ranking-section";


        const rankingTitle =
            document.createElement("div");

        rankingTitle.className = "retrieval-title";

        rankingTitle.textContent =
            "Retrieved Chunk Ranking";

        rankingSection.appendChild(rankingTitle);


        ranking.forEach((item, index) => {

            const rankItem =
                document.createElement("div");

            rankItem.className = "rank-item";


            const rankLeft =
                document.createElement("div");

            rankLeft.className = "rank-left";


            const rankNumber =
                document.createElement("div");

            rankNumber.className = "rank-number";

            rankNumber.textContent =
                item.rank ?? index + 1;


            const rankInfo =
                document.createElement("div");

            rankInfo.className = "rank-info";


            const rankFile =
                document.createElement("div");

            rankFile.className = "rank-file";

            rankFile.textContent =
                item.source || "Unknown source";


            const chunkId =
                document.createElement("div");

            chunkId.className = "chunk-id";

            chunkId.textContent =
                item.id || "Unknown chunk";


            const viewButton =
                document.createElement("button");

            viewButton.className =
                "view-chunk-btn";

            viewButton.textContent =
                "View retrieved chunk";


            const chunkContent =
                document.createElement("div");

            chunkContent.className =
                "chunk-content";

            chunkContent.style.display = "none";

            chunkContent.textContent =
                item.content || "No content available.";


            viewButton.addEventListener(
                "click",
                () => {

                    const isHidden =
                        chunkContent.style.display === "none";

                    chunkContent.style.display =
                        isHidden ? "block" : "none";

                    viewButton.textContent =
                        isHidden
                            ? "Hide retrieved chunk"
                            : "View retrieved chunk";
                }
            );


            rankInfo.appendChild(rankFile);
            rankInfo.appendChild(chunkId);
            rankInfo.appendChild(viewButton);
            rankInfo.appendChild(chunkContent);


            rankLeft.appendChild(rankNumber);
            rankLeft.appendChild(rankInfo);


            const scoreGroup =
                document.createElement("div");

            scoreGroup.className = "score-group";


            const hybridScore =
                document.createElement("div");

            hybridScore.className = "score-box";

            hybridScore.innerHTML = `
                <span>Hybrid</span>
                <strong>
                    ${formatScore(item.hybrid_score)}
                </strong>
            `;


            const semanticScore =
                document.createElement("div");

            semanticScore.className =
                "score-box semantic-score";

            semanticScore.innerHTML = `
                <span>Semantic</span>
                <strong>
                    ${formatScore(item.semantic_score)}
                </strong>
            `;


            scoreGroup.appendChild(hybridScore);
            scoreGroup.appendChild(semanticScore);


            rankItem.appendChild(rankLeft);
            rankItem.appendChild(scoreGroup);

            rankingSection.appendChild(rankItem);
        });


        panel.appendChild(rankingSection);
    }


    panelRow.appendChild(panel);

    chatBox.appendChild(panelRow);

    scrollToBottom();
}


// ==========================================
// TOOL TRACE
// ==========================================

function addToolTrace(toolTrace) {

    const panelRow =
        document.createElement("div");

    panelRow.className = "message-row bot";


    const panel =
        document.createElement("div");

    panel.className = "tool-trace-panel";


    const title =
        document.createElement("div");

    title.className = "tool-trace-title";

    title.textContent = "Agent Tool Trace";


    panel.appendChild(title);


    toolTrace.forEach((item, index) => {

        const traceItem =
            document.createElement("div");

        traceItem.className = "tool-trace-item";


        // Header
        const header =
            document.createElement("div");

        header.className = "tool-trace-header";


        const headerLeft =
            document.createElement("div");

        headerLeft.className =
            "tool-trace-header-left";


        const number =
            document.createElement("div");

        number.className = "tool-number";

        number.textContent = index + 1;


        const toolName =
            document.createElement("div");

        toolName.className = "tool-name";

        toolName.textContent =
            item.tool || "Unknown Tool";


        const arrow =
            document.createElement("div");

        arrow.className = "tool-arrow";

        arrow.textContent = "▼";


        headerLeft.appendChild(number);
        headerLeft.appendChild(toolName);

        header.appendChild(headerLeft);
        header.appendChild(arrow);


        // Details
        const details =
            document.createElement("div");

        details.className =
            "tool-trace-details";

        details.style.display = "none";


        const argumentsLabel =
            document.createElement("div");

        argumentsLabel.className =
            "tool-detail-label";

        argumentsLabel.textContent =
            "Tool Arguments";


        const argumentsBox =
            document.createElement("div");

        argumentsBox.className =
            "tool-arguments";


        // Make email arguments readable
        if (
            item.tool === "send_email" &&
            item.arguments
        ) {

            argumentsBox.textContent =
                `Recipient: ${item.arguments.recipient || ""}\n` +
                `Subject: ${item.arguments.subject || ""}\n\n` +
                `Body:\n${item.arguments.body || ""}`;

        } else {

            argumentsBox.textContent =
                JSON.stringify(
                    item.arguments || {},
                    null,
                    2
                );
        }


        const resultLabel =
            document.createElement("div");

        resultLabel.className =
            "tool-detail-label";

        resultLabel.textContent =
            "Tool Result";


        const resultBox =
            document.createElement("div");

        resultBox.className =
            "tool-result";


        // Shorter email result
        if (
            item.tool === "send_email" &&
            item.result
        ) {

            resultBox.textContent =
                `✓ Email sent successfully\n` +
                `Status: ${item.result.status || "Sent"}`;

        } else {

            resultBox.textContent =
                JSON.stringify(
                    item.result,
                    null,
                    2
                );
        }


        details.appendChild(argumentsLabel);
        details.appendChild(argumentsBox);
        details.appendChild(resultLabel);
        details.appendChild(resultBox);


        // Accordion
        header.addEventListener(
            "click",
            () => {

                const hidden =
                    details.style.display === "none";

                details.style.display =
                    hidden ? "block" : "none";

                arrow.textContent =
                    hidden ? "▲" : "▼";
            }
        );


        traceItem.appendChild(header);
        traceItem.appendChild(details);

        panel.appendChild(traceItem);
    });


    panelRow.appendChild(panel);

    chatBox.appendChild(panelRow);

    scrollToBottom();
}


// ==========================================
// SUGGESTIONS
// ==========================================

function useSuggestion(text) {

    input.value = text;

    autoResizeTextarea();

    input.focus();
}


// ==========================================
// SEND BUTTON
// ==========================================

sendButton.addEventListener(
    "click",
    sendMessage
);


// ==========================================
// ENTER TO SEND
// ==========================================

input.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);


// ==========================================
// TEXTAREA AUTO RESIZE
// ==========================================

input.addEventListener(
    "input",
    autoResizeTextarea
);


function autoResizeTextarea() {

    input.style.height = "auto";

    input.style.height =
        `${input.scrollHeight}px`;
}


// ==========================================
// SCROLL
// ==========================================

function scrollToBottom() {

    chatBox.scrollTop =
        chatBox.scrollHeight;
}


// ==========================================
// SCORE FORMATTER
// ==========================================

function formatScore(score) {

    if (
        score === null ||
        score === undefined
    ) {
        return "—";
    }

    const number = Number(score);

    if (Number.isNaN(number)) {
        return "—";
    }

    return number.toFixed(3);
}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text ?? "";

    return div.innerHTML;
}


// ==========================================
// DOCUMENT ASSISTANT VIEW
// ==========================================

assistantButton.addEventListener(
    "click",
    () => {

        // Hide evaluation views
        evaluationPanel.classList.remove("active");
        adaptiveEvaluationPanel.classList.remove("active");

        // Show chat
        chatBox.style.display = "flex";
        inputWrapper.style.display = "block";

        // Restore page title
        pageTitle.textContent =
            "Document Assistant";

        pageSubtitle.textContent =
            "Ask questions about your knowledge base";
    }
);

// ==========================================
// RAG EVALUATION VIEW
// ==========================================

evaluationButton.addEventListener(
    "click",
    () => {

        // Hide chat
        chatBox.style.display = "none";
        inputWrapper.style.display = "none";

        // Hide Adaptive Evaluation
        adaptiveEvaluationPanel.classList.remove("active");

        // Show RAG Evaluation
        evaluationPanel.classList.add("active");

        // Change page title
        pageTitle.textContent =
            "RAG Evaluation";

        pageSubtitle.textContent =
            "Evaluate your RAG pipeline using TruLens RAG Triad";
    }
);

// ==========================================
// ADAPTIVE RAG EVALUATION VIEW
// ==========================================

adaptiveEvaluationButton.addEventListener(
    "click",
    async () => {

        // Hide chat
        chatBox.style.display = "none";
        inputWrapper.style.display = "none";

        // Hide normal RAG Evaluation
        evaluationPanel.classList.remove("active");

        // Show Adaptive RAG Evaluation
        adaptiveEvaluationPanel.classList.add("active");

        // Change page title
        pageTitle.textContent =
            "Adaptive RAG Evaluation";

        pageSubtitle.textContent =
            "Evaluate adaptive retrieval, rewriting, reranking and multi-hop RAG";

        // Load ONLY the last saved results
        await loadAdaptiveEvaluation();
    }
);

// ==========================================
// RUN RAG EVALUATION
// ==========================================

runEvaluationButton.addEventListener(
    "click",
    async () => {

        const testCasesContainer =
            document.getElementById(
                "evaluation-test-cases"
            );


        // Loading state
        runEvaluationButton.disabled = true;

        runEvaluationButton.textContent =
            "Running Evaluation...";


        testCasesContainer.innerHTML = `
            <div class="evaluation-empty">
                Running TruLens RAG Triad evaluation...
                This may take a moment.
            </div>
        `;


        try {

            const response =
                await fetch(
                    "/evaluate",
                    {
                        method: "POST"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Evaluation failed."
                );
            }


            // ==================================
            // AVERAGE METRICS
            // ==================================

            document.getElementById(
                "context-score"
            ).textContent =
                Number(
                    data.averages.context_relevance
                ).toFixed(3);


            document.getElementById(
                "groundedness-score"
            ).textContent =
                Number(
                    data.averages.groundedness
                ).toFixed(3);


            document.getElementById(
                "answer-score"
            ).textContent =
                Number(
                    data.averages.answer_relevance
                ).toFixed(3);


            // Clear loading message
            testCasesContainer.innerHTML = "";


            // ==================================
            // TEST CASES
            // ==================================

            data.results.forEach((result) => {

                const testCard = document.createElement("div");
                testCard.className = "evaluation-test";
            
            
                // ======================================
                // TEST HEADER
                // ======================================
            
                const header = document.createElement("div");
                header.className = "evaluation-test-header";
            
                header.innerHTML = `
                    <div class="evaluation-test-title">
                        <strong>Test Case ${result.test}</strong>
                        <span>${escapeHTML(result.question)}</span>
                    </div>
            
                    <div class="evaluation-test-summary">
            
                        <div>
                            <small>Context</small>
                            <strong>${formatScore(result.context_relevance)}</strong>
                        </div>
            
                        <div>
                            <small>Groundedness</small>
                            <strong>${formatScore(result.groundedness)}</strong>
                        </div>
            
                        <div>
                            <small>Answer</small>
                            <strong>${formatScore(result.answer_relevance)}</strong>
                        </div>
            
                        <span class="evaluation-arrow">▼</span>
            
                    </div>
                `;
            
            
                // ======================================
                // TEST DETAILS
                // ======================================
            
                const details = document.createElement("div");
                details.className = "evaluation-test-details";
                details.style.display = "none";
            
            
                // Question
                const questionSection = document.createElement("div");
                questionSection.className = "evaluation-detail-section";
            
                questionSection.innerHTML = `
                    <h4>Question</h4>
                    <p>${escapeHTML(result.question)}</p>
                `;
            
            
                // Answer
                const answerSection = document.createElement("div");
                answerSection.className = "evaluation-detail-section";
            
                answerSection.innerHTML = `
                    <h4>Generated Answer</h4>
                    <div class="evaluation-answer">
                        ${escapeHTML(result.answer)}
                    </div>
                `;
            
            
                // Metrics
                const metricsSection = document.createElement("div");
                metricsSection.className = "evaluation-detail-section";
            
                metricsSection.innerHTML = `
                    <h4>RAG Triad Scores</h4>
            
                    <div class="evaluation-detail-metrics">
            
                        <div>
                            <span>Context Relevance</span>
                            <strong>
                                ${formatScore(result.context_relevance)}
                            </strong>
                        </div>
            
                        <div>
                            <span>Groundedness</span>
                            <strong>
                                ${formatScore(result.groundedness)}
                            </strong>
                        </div>
            
                        <div>
                            <span>Answer Relevance</span>
                            <strong>
                                ${formatScore(result.answer_relevance)}
                            </strong>
                        </div>
            
                    </div>
                `;
            
            
                // ======================================
                // RETRIEVED CHUNKS
                // ======================================
            
                const chunksSection = document.createElement("div");
                chunksSection.className = "evaluation-detail-section";
            
                const chunksTitle = document.createElement("h4");
                chunksTitle.textContent = "Retrieved Chunks";
            
                chunksSection.appendChild(chunksTitle);
            
            
                if (
                    Array.isArray(result.chunks) &&
                    result.chunks.length > 0
                ) {
            
                    result.chunks.forEach((chunk, index) => {
            
                        const chunkBox = document.createElement("div");
                        chunkBox.className = "evaluation-chunk";
            
                        chunkBox.innerHTML = `
                            <div class="evaluation-chunk-header">
            
                                <div>
                                    <strong>Chunk ${index + 1}</strong>
                                    <span>
                                        ${escapeHTML(chunk.source)}
                                    </span>
                                </div>
            
                                <div class="evaluation-chunk-scores">
            
                                    <span>
                                        Context:
                                        <strong>
                                            ${formatScore(
                                                chunk.context_relevance
                                            )}
                                        </strong>
                                    </span>
            
                                    <span>
                                        Hybrid:
                                        <strong>
                                            ${formatScore(
                                                chunk.hybrid_score
                                            )}
                                        </strong>
                                    </span>
            
                                    <span>
                                        Semantic:
                                        <strong>
                                            ${formatScore(
                                                chunk.semantic_score
                                            )}
                                        </strong>
                                    </span>
            
                                </div>
            
                            </div>
            
                            <div class="evaluation-chunk-id">
                                ${escapeHTML(chunk.id)}
                            </div>
            
                            <div class="evaluation-chunk-content">
                                ${escapeHTML(chunk.content)}
                            </div>
                        `;
            
                        chunksSection.appendChild(chunkBox);
                    });
                }
            
            
                // ======================================
                // BUILD DETAILS
                // ======================================
            
                details.appendChild(questionSection);
                details.appendChild(answerSection);
                details.appendChild(metricsSection);
                details.appendChild(chunksSection);
            
            
                // ======================================
                // ACCORDION
                // ======================================
            
                header.addEventListener("click", () => {
            
                    const hidden =
                        details.style.display === "none";
            
                    details.style.display =
                        hidden ? "block" : "none";
            
                    const arrow =
                        header.querySelector(".evaluation-arrow");
            
                    arrow.textContent =
                        hidden ? "▲" : "▼";
                });
            
            
                testCard.appendChild(header);
                testCard.appendChild(details);
            
                testCasesContainer.appendChild(testCard);
            });


        } catch (error) {

            testCasesContainer.innerHTML = `
                <div class="evaluation-empty">
                    Evaluation failed:
                    ${escapeHTML(error.message)}
                </div>
            `;


        } finally {

            runEvaluationButton.disabled = false;

            runEvaluationButton.textContent =
                "Run Evaluation";
        }
    }
);


// ==========================================
// ADAPTIVE RAG EVALUATION
// ==========================================

async function loadAdaptiveEvaluation() {

    const testCasesContainer =
        document.getElementById(
            "adaptive-test-cases"
        );

    try {

        const response = await fetch(
            "/adaptive-evaluation"
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Could not load Adaptive RAG evaluation."
            );
        }

        renderAdaptiveEvaluation(data);

    } catch (error) {

        testCasesContainer.innerHTML = `
            <div class="evaluation-empty">
                Failed to load Adaptive RAG evaluation:
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


// ==========================================
// RENDER ADAPTIVE EVALUATION
// ==========================================

function renderAdaptiveEvaluation(data) {

    const summary = data.summary;

    // ------------------------------------------
    // SUMMARY
    // ------------------------------------------

    document.getElementById(
        "adaptive-precision"
    ).textContent =
        formatScore(
            summary.average_precision_at_k
        );

    document.getElementById(
        "adaptive-recall"
    ).textContent =
        formatScore(
            summary.average_retrieval_recall
        );

    document.getElementById(
        "adaptive-context"
    ).textContent =
        formatScore(
            summary.average_context_relevance
        );

    document.getElementById(
        "adaptive-correctness"
    ).textContent =
        formatScore(
            summary.average_answer_correctness
        );

    document.getElementById(
        "adaptive-faithfulness"
    ).textContent =
        formatScore(
            summary.average_faithfulness
        );

    document.getElementById(
        "adaptive-failure-rate"
    ).textContent =
        `${(
            Number(
                summary.retrieval_failure_rate
            ) * 100
        ).toFixed(0)}%`;

    document.getElementById(
        "adaptive-rewrite-success"
    ).textContent =
        `${(
            Number(
                summary.query_rewriting_success_rate
            ) * 100
        ).toFixed(0)}%`;

    document.getElementById(
        "adaptive-attempts"
    ).textContent =
        Number(
            summary.average_retrieval_attempts
        ).toFixed(2);

    document.getElementById(
        "adaptive-latency"
    ).textContent =
        `${Number(
            summary.average_latency_seconds
        ).toFixed(2)} sec`;

    document.getElementById(
        "adaptive-test-count"
    ).textContent =
        summary.total_test_cases;


    // ------------------------------------------
    // TEST CASES
    // ------------------------------------------

    const testCasesContainer =
        document.getElementById(
            "adaptive-test-cases"
        );

    testCasesContainer.innerHTML = "";


    data.results.forEach((result) => {

        const testCard =
            document.createElement("div");

        testCard.className =
            "evaluation-test";


        // ======================================
        // HEADER
        // ======================================

        const header =
            document.createElement("div");

        header.className =
            "evaluation-test-header";


        const recallDisplay =
            result.retrieval_recall === null
                ? "N/A"
                : formatScore(
                    result.retrieval_recall
                );


        header.innerHTML = `
            <div class="evaluation-test-title">

                <strong>
                    Test Case ${result.id}
                    ·
                    ${escapeHTML(result.type)}
                </strong>

                <span>
                    ${escapeHTML(result.query)}
                </span>

            </div>


            <div class="evaluation-test-summary">

                <div>
                    <small>Precision</small>
                    <strong>
                        ${formatScore(
                            result.precision_at_k
                        )}
                    </strong>
                </div>

                <div>
                    <small>Recall</small>
                    <strong>
                        ${recallDisplay}
                    </strong>
                </div>

                <div>
                    <small>Correctness</small>
                    <strong>
                        ${formatScore(
                            result.answer_correctness
                        )}
                    </strong>
                </div>

                <span class="evaluation-arrow">
                    ▼
                </span>

            </div>
        `;


        // ======================================
        // DETAILS
        // ======================================

        const details =
            document.createElement("div");

        details.className =
            "evaluation-test-details";

        details.style.display = "none";


        const qualityText =
            result.quality_sufficient
                ? "Sufficient"
                : "Insufficient";


        // --------------------------------------
        // PIPELINE
        // --------------------------------------

        const pipelineSection =
            document.createElement("div");

        pipelineSection.className =
            "evaluation-detail-section";

        pipelineSection.innerHTML = `
            <h4>Adaptive Retrieval Pipeline</h4>

            <div class="evaluation-detail-metrics">

                <div>
                    <span>Retrieval Strategy</span>
                    <strong>
                        ${escapeHTML(
                            result.strategy
                        )}
                    </strong>
                </div>

                <div>
                    <span>Retrieval Attempts</span>
                    <strong>
                        ${result.retrieval_attempts}
                    </strong>
                </div>

                <div>
                    <span>Final Quality</span>
                    <strong>
                        ${qualityText}
                    </strong>
                </div>

                <div>
                    <span>Re-ranking</span>
                    <strong>
                        ${
                            result.reranking_applied
                                ? "Applied"
                                : "Not Applied"
                        }
                    </strong>
                </div>

            </div>
        `;


        // --------------------------------------
        // EXPECTED INFORMATION
        // --------------------------------------

        const expectedSection =
            document.createElement("div");

        expectedSection.className =
            "evaluation-detail-section";

        expectedSection.innerHTML = `
            <h4>Expected Information</h4>

            <p>
                ${escapeHTML(
                    result.expected_information
                )}
            </p>
        `;


        // --------------------------------------
        // QUERY REWRITING
        // --------------------------------------

        const rewriteSection =
            document.createElement("div");

        rewriteSection.className =
            "evaluation-detail-section";


        if (result.rewrite_triggered) {

            rewriteSection.innerHTML = `
                <h4>Query Rewriting</h4>

                <p>
                    <strong>Triggered:</strong>
                    Yes
                </p>

                <p>
                    <strong>Rewritten Query:</strong>
                    ${escapeHTML(
                        result.rewritten_query ||
                        "No rewritten query returned."
                    )}
                </p>
            `;

        } else {

            rewriteSection.innerHTML = `
                <h4>Query Rewriting</h4>

                <p>
                    <strong>Triggered:</strong>
                    No
                </p>
            `;
        }


        // --------------------------------------
        // RE-RANKING
        // --------------------------------------

        const rerankingSection =
            document.createElement("div");

        rerankingSection.className =
            "evaluation-detail-section";


        let beforeHTML = "";

        if (
            Array.isArray(
                result.before_reranking_ids
            ) &&
            result.before_reranking_ids.length > 0
        ) {

            result.before_reranking_ids.forEach(
                (id, index) => {

                    beforeHTML += `
                        <div class="evaluation-chunk-id">
                            ${index + 1}.
                            ${escapeHTML(id)}
                        </div>
                    `;
                }
            );

        } else {

            beforeHTML = `
                <p>
                    No pre-reranking candidates available.
                </p>
            `;
        }


        let afterHTML = "";

        if (
            Array.isArray(
                result.after_reranking_ids
            ) &&
            result.after_reranking_ids.length > 0
        ) {

            result.after_reranking_ids.forEach(
                (id, index) => {

                    afterHTML += `
                        <div class="evaluation-chunk-id">
                            ${index + 1}.
                            ${escapeHTML(id)}
                        </div>
                    `;
                }
            );

        } else {

            afterHTML = `
                <p>
                    No final ranked chunks available.
                </p>
            `;
        }


        rerankingSection.innerHTML = `
            <h4>Re-ranking</h4>

            <p>
                <strong>Applied:</strong>
                ${
                    result.reranking_applied
                        ? "Yes"
                        : "No"
                }
            </p>

            <div class="evaluation-detail-metrics">

                <div>
                    <span>
                        Before Re-ranking
                    </span>

                    <div>
                        ${beforeHTML}
                    </div>
                </div>

                <div>
                    <span>
                        After Re-ranking
                    </span>

                    <div>
                        ${afterHTML}
                    </div>
                </div>

            </div>
        `;


        // --------------------------------------
        // QUALITY CHECK
        // --------------------------------------

        const qualitySection =
            document.createElement("div");

        qualitySection.className =
            "evaluation-detail-section";

        qualitySection.innerHTML = `
            <h4>Retrieval Quality Check</h4>

            <p>
                <strong>
                    ${qualityText}
                </strong>
            </p>

            <p>
                ${escapeHTML(
                    result.quality_reason ||
                    "No quality reason available."
                )}
            </p>
        `;


        // --------------------------------------
        // FINAL ANSWER
        // --------------------------------------

        const answerSection =
            document.createElement("div");

        answerSection.className =
            "evaluation-detail-section";

        answerSection.innerHTML = `
            <h4>Final Answer</h4>

            <div class="evaluation-answer">
                ${escapeHTML(
                    result.answer
                )}
            </div>
        `;


        // --------------------------------------
        // METRICS
        // --------------------------------------

        const metricsSection =
            document.createElement("div");

        metricsSection.className =
            "evaluation-detail-section";

        metricsSection.innerHTML = `
            <h4>Evaluation Metrics</h4>

            <div class="evaluation-detail-metrics">

                <div>
                    <span>Precision@K</span>
                    <strong>
                        ${formatScore(
                            result.precision_at_k
                        )}
                    </strong>
                </div>

                <div>
                    <span>Retrieval Recall</span>
                    <strong>
                        ${recallDisplay}
                    </strong>
                </div>

                <div>
                    <span>Context Relevance</span>
                    <strong>
                        ${formatScore(
                            result.context_relevance
                        )}
                    </strong>
                </div>

                <div>
                    <span>Answer Correctness</span>
                    <strong>
                        ${formatScore(
                            result.answer_correctness
                        )}
                    </strong>
                </div>

                <div>
                    <span>Faithfulness</span>
                    <strong>
                        ${formatScore(
                            result.faithfulness
                        )}
                    </strong>
                </div>

                <div>
                    <span>Latency</span>
                    <strong>
                        ${Number(
                            result.latency_seconds
                        ).toFixed(2)}s
                    </strong>
                </div>

            </div>
        `;


        // --------------------------------------
        // SOURCES
        // --------------------------------------

        const sourcesSection =
            document.createElement("div");

        sourcesSection.className =
            "evaluation-detail-section";

        let sourcesHTML =
            "<h4>Sources</h4>";


        if (
            Array.isArray(result.sources) &&
            result.sources.length > 0
        ) {

            result.sources.forEach(
                (source) => {

                    sourcesHTML += `
                        <p>
                            📄
                            ${escapeHTML(source)}
                        </p>
                    `;
                }
            );

        } else {

            sourcesHTML += `
                <p>
                    No supporting sources.
                </p>
            `;
        }


        sourcesSection.innerHTML =
            sourcesHTML;


        // --------------------------------------
        // FINAL CHUNKS
        // --------------------------------------

        const chunksSection =
            document.createElement("div");

        chunksSection.className =
            "evaluation-detail-section";


        const chunksTitle =
            document.createElement("h4");

        chunksTitle.textContent =
            "Final Retrieved Chunks";

        chunksSection.appendChild(
            chunksTitle
        );


        if (
            Array.isArray(result.chunks) &&
            result.chunks.length > 0
        ) {

            result.chunks.forEach(
                (chunk, index) => {

                    const chunkBox =
                        document.createElement(
                            "div"
                        );

                    chunkBox.className =
                        "evaluation-chunk";


                    chunkBox.innerHTML = `
                        <div class="evaluation-chunk-header">

                            <div>

                                <strong>
                                    Chunk ${index + 1}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        chunk.source
                                    )}
                                </span>

                            </div>

                        </div>

                        <div class="evaluation-chunk-id">
                            ${escapeHTML(
                                chunk.id
                            )}
                        </div>

                        <div class="evaluation-chunk-content">
                            ${escapeHTML(
                                chunk.content
                            )}
                        </div>
                    `;


                    chunksSection.appendChild(
                        chunkBox
                    );
                }
            );

        } else {

            const emptyChunks =
                document.createElement("p");

            emptyChunks.textContent =
                "No chunks retrieved.";

            chunksSection.appendChild(
                emptyChunks
            );
        }


        // ======================================
        // BUILD DETAILS
        // ======================================

        details.appendChild(
            pipelineSection
        );

        details.appendChild(
            expectedSection
        );

        details.appendChild(
            rewriteSection
        );

        details.appendChild(
            rerankingSection
        );

        details.appendChild(
            qualitySection
        );

        details.appendChild(
            answerSection
        );

        details.appendChild(
            metricsSection
        );

        details.appendChild(
            sourcesSection
        );

        details.appendChild(
            chunksSection
        );


        // ======================================
        // ACCORDION
        // ======================================

        header.addEventListener(
            "click",
            () => {

                const hidden =
                    details.style.display ===
                    "none";

                details.style.display =
                    hidden
                        ? "block"
                        : "none";

                const arrow =
                    header.querySelector(
                        ".evaluation-arrow"
                    );

                arrow.textContent =
                    hidden ? "▲" : "▼";
            }
        );


        testCard.appendChild(header);
        testCard.appendChild(details);

        testCasesContainer.appendChild(
            testCard
        );
    });
}



// ==========================================
// RUN NEW ADAPTIVE EVALUATION
// ==========================================

runAdaptiveEvaluationButton.addEventListener(
    "click",
    async () => {

        const originalText =
            runAdaptiveEvaluationButton.textContent;

        try {

            runAdaptiveEvaluationButton.disabled =
                true;

            runAdaptiveEvaluationButton.textContent =
                "Running Adaptive Evaluation...";


            // IMPORTANT:
            // Existing results stay visible while
            // the new evaluation is running.

            const response = await fetch(
                "/run-adaptive-evaluation",
                {
                    method: "POST"
                }
            );


            // Protect against Flask returning HTML
            // instead of JSON.
            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            if (
                !contentType.includes(
                    "application/json"
                )
            ) {

                const errorText =
                    await response.text();

                console.error(
                    "Server returned non-JSON:",
                    errorText
                );

                throw new Error(
                    "The server returned an invalid response. " +
                    "Check the Flask terminal for the error."
                );
            }


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Adaptive evaluation failed."
                );
            }


            // The POST already returns the NEW results.
            // Render them immediately.
            renderAdaptiveEvaluation(data);


            runAdaptiveEvaluationButton.textContent =
                "Evaluation Complete ✓";


        } catch (error) {

            console.error(error);

            alert(
                "Adaptive RAG Evaluation failed:\n" +
                error.message
            );

        } finally {

            runAdaptiveEvaluationButton.disabled =
                false;


            setTimeout(() => {

                runAdaptiveEvaluationButton.textContent =
                    originalText;

            }, 2000);
        }
    }
);


// ==========================================
// LOAD SAVED RESULTS ON PAGE LOAD
// ==========================================