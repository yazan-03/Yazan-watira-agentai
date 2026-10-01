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

const voiceAgentButton =
    document.getElementById("voice-agent-button");

const voiceAgentPanel =
    document.getElementById("voice-agent-panel");

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
        voiceAgentPanel.classList.remove("active");
        stopVoiceSession();

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
        voiceAgentPanel.classList.remove("active");
        stopVoiceSession();

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
        voiceAgentPanel.classList.remove("active");
        stopVoiceSession();

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
// VOICE RAG AGENT VIEW
// ==========================================

voiceAgentButton.addEventListener(
    "click",
    async () => {
        chatBox.style.display = "none";
        inputWrapper.style.display = "none";
        evaluationPanel.classList.remove("active");
        adaptiveEvaluationPanel.classList.remove("active");
        voiceAgentPanel.classList.add("active");

        pageTitle.textContent = "Voice RAG Agent";
        pageSubtitle.textContent =
            "Arabic / English voice conversation with real-time barge-in";

        await loadVoiceTestCases();
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
// VOICE RAG AGENT
// ==========================================

const voiceSessionButton =
    document.getElementById("voice-session-button");

const clearVoiceHistoryButton =
    document.getElementById("clear-voice-history-button");

const exportVoiceTestsButton =
    document.getElementById("export-voice-tests-button");

const voiceStatus = document.getElementById("voice-status");
const voiceStatusDetail = document.getElementById("voice-status-detail");
const voiceLiveText = document.getElementById("voice-live-text");
const voiceLanguage = document.getElementById("voice-language");
const voiceInterruptions = document.getElementById("voice-interruptions");
const voiceHistoryCount = document.getElementById("voice-history-count");
const voiceListeningBadge = document.getElementById("voice-listening-badge");
const voiceMessages = document.getElementById("voice-messages");
const voiceOrb = document.getElementById("voice-orb");

let speechRecognizer = null;
let speechTokenCache = null;
let voiceListening = false;
let voiceSpeaking = false;
let voiceAudio = null;
let voiceAudioUrl = null;
let voiceSynthesizer = null;
let voiceFetchController = null;
let speechTokenRefreshTimer = null;
let voiceTurnVersion = 0;
let voiceInterruptionCount = 0;
let voiceConversationHistory = [];
let voiceTestCasesData = [];
let lastRecognizedText = "";
let lastRecognizedAt = 0;


function setVoiceState(state, title, detail) {
    voiceOrb.className = `voice-orb ${state}`;
    voiceStatus.textContent = title;
    voiceStatusDetail.textContent = detail;
}


function languageLabel(locale) {
    return locale === "ar-JO" ? "العربية (الأردن)" : "English (US)";
}


function inferVoiceLanguage(text) {
    return /[\u0600-\u06ff]/.test(text) ? "ar-JO" : "en-US";
}


async function getSpeechToken(forceRefresh = false) {
    const now = Date.now();

    if (
        !forceRefresh &&
        speechTokenCache &&
        speechTokenCache.expiresAt > now
    ) {
        return speechTokenCache;
    }

    const response = await fetch("/speech-token");
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Azure Speech authentication failed.");
    }

    speechTokenCache = {
        token: data.token,
        region: data.region,
        // Azure Speech tokens last 10 minutes. Refresh early.
        expiresAt: now + (8 * 60 * 1000)
    };

    return speechTokenCache;
}


function createRecognitionConfig(credentials) {
    const endpoint = new URL(
        `wss://${credentials.region}.stt.speech.microsoft.com/` +
        "speech/universal/v2"
    );

    // Passing an empty string as the second argument is rejected by recent
    // Speech SDK builds. Omitting it lets us apply the short-lived token below.
    const speechConfig = SpeechSDK.SpeechConfig.fromEndpoint(endpoint);
    speechConfig.authorizationToken = credentials.token;
    speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
    speechConfig.setProperty(
        SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode,
        "Continuous"
    );

    return speechConfig;
}


let speechSdkLoadPromise = null;


function ensureSpeechSdkLoaded() {
    if (window.SpeechSDK) {
        return Promise.resolve(window.SpeechSDK);
    }

    if (speechSdkLoadPromise) {
        return speechSdkLoadPromise;
    }

    speechSdkLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const timeout = window.setTimeout(() => {
            script.remove();
            speechSdkLoadPromise = null;
            reject(new Error(
                "Azure Speech SDK took too long to load. Check the internet connection and try again."
            ));
        }, 15000);

        script.id = "azure-speech-sdk";
        script.src = "https://aka.ms/csspeech/jsbrowserpackageraw";
        script.async = true;
        script.onload = () => {
            window.clearTimeout(timeout);

            if (window.SpeechSDK) {
                resolve(window.SpeechSDK);
                return;
            }

            speechSdkLoadPromise = null;
            reject(new Error("Azure Speech SDK loaded without exposing SpeechSDK."));
        };
        script.onerror = () => {
            window.clearTimeout(timeout);
            script.remove();
            speechSdkLoadPromise = null;
            reject(new Error(
                "Could not download Azure Speech SDK. Check the internet connection and try again."
            ));
        };

        document.head.appendChild(script);
    });

    return speechSdkLoadPromise;
}


async function startVoiceSession() {
    if (voiceListening) {
        stopVoiceSession();
        return;
    }

    voiceSessionButton.disabled = true;
    setVoiceState(
        "connecting",
        "Connecting…",
        "Requesting Azure Speech access and microphone permission."
    );

    try {
        await ensureSpeechSdkLoaded();
        const credentials = await getSpeechToken();
        const speechConfig = createRecognitionConfig(credentials);
        const languageConfig =
            SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages([
                "ar-JO",
                "en-US"
            ]);
        const audioConfig =
            SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

        speechRecognizer = SpeechSDK.SpeechRecognizer.FromConfig(
            speechConfig,
            languageConfig,
            audioConfig
        );

        speechRecognizer.recognizing = (_, event) => {
            const partialText = (event.result.text || "").trim();

            if (!partialText) {
                return;
            }

            voiceLiveText.textContent = partialText;

            // The recognizer stays active during TTS. Any new speech pauses the
            // current audio immediately, before the utterance is finalized.
            if (voiceSpeaking || voiceAudio || voiceSynthesizer) {
                stopVoicePlayback(true);
                setVoiceState(
                    "listening",
                    "Interrupted — listening",
                    "The previous answer stopped. Finish your new question."
                );
            }
        };

        speechRecognizer.recognized = (_, event) => {
            if (
                event.result.reason !==
                SpeechSDK.ResultReason.RecognizedSpeech
            ) {
                return;
            }

            const text = (event.result.text || "").trim();

            if (!text) {
                return;
            }

            // Avoid submitting the same final event twice after reconnects.
            const now = Date.now();

            if (
                text === lastRecognizedText &&
                now - lastRecognizedAt < 1500
            ) {
                return;
            }

            lastRecognizedText = text;
            lastRecognizedAt = now;

            let detectedLanguage = inferVoiceLanguage(text);

            try {
                const languageResult =
                    SpeechSDK.AutoDetectSourceLanguageResult.fromResult(
                        event.result
                    );

                if (["ar-JO", "en-US"].includes(languageResult.language)) {
                    detectedLanguage = languageResult.language;
                }
            } catch (error) {
                console.warn("Language result unavailable:", error);
            }

            voiceLiveText.textContent = text;
            voiceLanguage.textContent = languageLabel(detectedLanguage);
            handleVoiceUtterance(text, detectedLanguage);
        };

        speechRecognizer.canceled = (_, event) => {
            console.error("Speech recognition canceled:", event.errorDetails);

            if (event.errorDetails) {
                setVoiceState(
                    "error",
                    "Recognition stopped",
                    event.errorDetails
                );
            }
        };

        speechRecognizer.sessionStopped = () => {
            if (voiceListening) {
                voiceListening = false;
                updateVoiceSessionControls();
            }
        };

        speechRecognizer.startContinuousRecognitionAsync(
            () => {
                voiceListening = true;
                scheduleSpeechTokenRefresh();
                updateVoiceSessionControls();
                setVoiceState(
                    "listening",
                    "Listening",
                    "Speak naturally in Arabic or English."
                );
            },
            (error) => {
                console.error("Could not start recognition:", error);
                voiceListening = false;
                closeSpeechRecognizer();
                updateVoiceSessionControls();
                setVoiceState(
                    "error",
                    "Could not start recognition",
                    String(error)
                );
            }
        );

    } catch (error) {
        console.error(error);
        setVoiceState("error", "Could not start", error.message);
        closeSpeechRecognizer();
    } finally {
        voiceSessionButton.disabled = false;
    }
}


function scheduleSpeechTokenRefresh() {
    if (speechTokenRefreshTimer) {
        clearInterval(speechTokenRefreshTimer);
    }

    speechTokenRefreshTimer = setInterval(async () => {
        if (!speechRecognizer) {
            return;
        }

        try {
            const credentials = await getSpeechToken(true);
            speechRecognizer.authorizationToken = credentials.token;
        } catch (error) {
            console.warn("Speech token refresh failed:", error);
        }
    }, 8 * 60 * 1000);
}


function updateVoiceSessionControls() {
    voiceSessionButton.textContent = voiceListening
        ? "Stop Voice Session"
        : "Start Voice Session";

    voiceSessionButton.classList.toggle("stop", voiceListening);
    voiceListeningBadge.textContent = voiceListening ? "Listening" : "Offline";
    voiceListeningBadge.classList.toggle("active", voiceListening);
}


function closeSpeechRecognizer() {
    if (!speechRecognizer) {
        return;
    }

    const recognizerToClose = speechRecognizer;
    speechRecognizer = null;

    try {
        recognizerToClose.stopContinuousRecognitionAsync(
            () => recognizerToClose.close(),
            () => recognizerToClose.close()
        );
    } catch (error) {
        console.warn("Recognizer cleanup failed:", error);
        recognizerToClose.close();
    }
}


function stopVoiceSession() {
    if (
        !voiceListening &&
        !speechRecognizer &&
        !voiceSpeaking &&
        !voiceSynthesizer &&
        !voiceFetchController
    ) {
        return;
    }

    voiceListening = false;

    if (speechTokenRefreshTimer) {
        clearInterval(speechTokenRefreshTimer);
        speechTokenRefreshTimer = null;
    }

    closeSpeechRecognizer();
    stopVoicePlayback(false);

    if (voiceFetchController) {
        voiceFetchController.abort();
        voiceFetchController = null;
    }

    updateVoiceSessionControls();
    setVoiceState(
        "idle",
        "Ready",
        "Start the session and allow microphone access."
    );
}


function stopVoicePlayback(countAsInterruption) {
    const hadActiveSpeech = Boolean(
        voiceSpeaking || voiceAudio || voiceSynthesizer
    );

    // Invalidates pending synthesis callbacks as well as currently playing audio.
    voiceTurnVersion += 1;

    if (voiceAudio) {
        voiceAudio.pause();
        voiceAudio.currentTime = 0;
        voiceAudio = null;
    }

    if (voiceAudioUrl) {
        URL.revokeObjectURL(voiceAudioUrl);
        voiceAudioUrl = null;
    }

    if (voiceSynthesizer) {
        try {
            voiceSynthesizer.close();
        } catch (error) {
            console.warn("Synthesizer cleanup failed:", error);
        }

        voiceSynthesizer = null;
    }

    voiceSpeaking = false;

    if (countAsInterruption && hadActiveSpeech) {
        voiceInterruptionCount += 1;
        voiceInterruptions.textContent = voiceInterruptionCount;
    }
}


async function handleVoiceUtterance(text, language) {
    stopVoicePlayback(false);

    if (voiceFetchController) {
        voiceFetchController.abort();
    }

    const requestHistory = voiceConversationHistory.slice(-12);

    voiceConversationHistory.push({
        role: "user",
        content: text,
        language
    });

    addVoiceMessage("user", text, language);
    updateVoiceHistoryCount();

    const currentVersion = ++voiceTurnVersion;
    voiceFetchController = new AbortController();

    setVoiceState(
        "thinking",
        language === "ar-JO" ? "جاري التفكير…" : "Thinking…",
        language === "ar-JO"
            ? "يتم البحث في قاعدة المعرفة."
            : "Searching the knowledge base."
    );

    try {
        const response = await fetch("/voice-chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text,
                language,
                history: requestHistory
            }),
            signal: voiceFetchController.signal
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Voice agent request failed.");
        }

        if (currentVersion !== voiceTurnVersion) {
            return;
        }

        const answerLanguage = data.language || language;

        voiceConversationHistory.push({
            role: "assistant",
            content: data.answer,
            language: answerLanguage
        });

        addVoiceMessage(
            "assistant",
            data.answer,
            answerLanguage,
            data.sources || []
        );
        updateVoiceHistoryCount();

        await speakVoiceAnswer(data.answer, answerLanguage, currentVersion);

    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error(error);
        addVoiceMessage("assistant", error.message, language, [], true);
        setVoiceState("error", "Voice agent error", error.message);
    }
}


async function speakVoiceAnswer(text, language, turnVersion) {
    const credentials = await getSpeechToken();

    if (turnVersion !== voiceTurnVersion) {
        return;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
        credentials.token,
        credentials.region
    );

    speechConfig.speechSynthesisLanguage = language;
    speechConfig.speechSynthesisVoiceName =
        language === "ar-JO"
            ? "ar-JO-SanaNeural"
            : "en-US-JennyNeural";
    speechConfig.speechSynthesisOutputFormat =
        SpeechSDK.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;

    voiceSynthesizer = new SpeechSDK.SpeechSynthesizer(
        speechConfig,
        null
    );

    setVoiceState(
        "thinking",
        language === "ar-JO" ? "جاري تجهيز الصوت…" : "Preparing speech…",
        language === "ar-JO"
            ? "سيبقى الميكروفون فعالًا للمقاطعة."
            : "The microphone remains active for barge-in."
    );

    await new Promise((resolve, reject) => {
        const synthesizerForTurn = voiceSynthesizer;

        synthesizerForTurn.speakTextAsync(
            text,
            (result) => {
                if (voiceSynthesizer === synthesizerForTurn) {
                    voiceSynthesizer = null;
                }

                synthesizerForTurn.close();

                if (turnVersion !== voiceTurnVersion) {
                    resolve();
                    return;
                }

                if (
                    result.reason !==
                    SpeechSDK.ResultReason.SynthesizingAudioCompleted
                ) {
                    reject(new Error("Azure Speech did not return audio."));
                    return;
                }

                const audioBlob = new Blob(
                    [result.audioData],
                    {type: "audio/wav"}
                );

                voiceAudioUrl = URL.createObjectURL(audioBlob);
                voiceAudio = new Audio(voiceAudioUrl);
                voiceSpeaking = true;

                voiceAudio.onplay = () => {
                    setVoiceState(
                        "speaking",
                        language === "ar-JO" ? "يتحدث الآن" : "Speaking",
                        language === "ar-JO"
                            ? "يمكنك مقاطعته في أي وقت."
                            : "You can interrupt at any time."
                    );
                };

                voiceAudio.onended = () => {
                    cleanupFinishedVoiceAudio();
                    setVoiceState(
                        "listening",
                        language === "ar-JO" ? "أستمع إليك" : "Listening",
                        language === "ar-JO"
                            ? "اطرح سؤالًا آخر."
                            : "Ask a follow-up question."
                    );
                    resolve();
                };

                voiceAudio.onerror = () => {
                    cleanupFinishedVoiceAudio();
                    reject(new Error("The browser could not play the response."));
                };

                voiceAudio.play().catch((error) => {
                    cleanupFinishedVoiceAudio();
                    reject(error);
                });
            },
            (error) => {
                if (voiceSynthesizer === synthesizerForTurn) {
                    voiceSynthesizer = null;
                }

                synthesizerForTurn.close();
                reject(new Error(String(error)));
            }
        );
    });
}


function cleanupFinishedVoiceAudio() {
    voiceSpeaking = false;
    voiceAudio = null;

    if (voiceAudioUrl) {
        URL.revokeObjectURL(voiceAudioUrl);
        voiceAudioUrl = null;
    }
}


function addVoiceMessage(role, text, language, sources = [], isError = false) {
    const emptyState = document.getElementById("voice-empty-state");

    if (emptyState) {
        emptyState.remove();
    }

    const row = document.createElement("div");
    row.className = `voice-message-row ${role}`;
    row.dir = language === "ar-JO" ? "rtl" : "ltr";

    const meta = document.createElement("div");
    meta.className = "voice-message-meta";
    meta.textContent = `${role === "user" ? "You" : "Watira"} · ${languageLabel(language)}`;

    const bubble = document.createElement("div");
    bubble.className = `voice-message${isError ? " error" : ""}`;
    bubble.textContent = text;

    row.appendChild(meta);
    row.appendChild(bubble);

    if (sources.length > 0) {
        const sourceList = document.createElement("div");
        sourceList.className = "voice-message-sources";
        sourceList.textContent = `Sources: ${sources.join(", ")}`;
        row.appendChild(sourceList);
    }

    voiceMessages.appendChild(row);
    voiceMessages.scrollTop = voiceMessages.scrollHeight;
}


function updateVoiceHistoryCount() {
    voiceHistoryCount.textContent = voiceConversationHistory.length;
}


function clearVoiceHistory() {
    stopVoicePlayback(false);
    voiceConversationHistory = [];
    voiceMessages.innerHTML = `
        <div id="voice-empty-state" class="voice-empty-state">
            <strong>ابدأ الحديث أو Start speaking</strong>
            <span>The agent detects Arabic or English automatically.</span>
        </div>
    `;
    voiceLiveText.textContent = "—";
    voiceLanguage.textContent = "—";
    updateVoiceHistoryCount();

    if (voiceListening) {
        setVoiceState("listening", "Listening", "Speak in Arabic or English.");
    }
}


async function loadVoiceTestCases() {
    if (voiceTestCasesData.length > 0) {
        renderVoiceTestCases();
        return;
    }

    const container = document.getElementById("voice-test-cases");

    try {
        const response = await fetch("/voice-test-cases");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not load test cases.");
        }

        voiceTestCasesData = data.test_cases;
        renderVoiceTestCases();
    } catch (error) {
        container.innerHTML = `
            <div class="evaluation-empty">${escapeHTML(error.message)}</div>
        `;
    }
}


function getStoredVoiceTestResults() {
    try {
        return JSON.parse(
            localStorage.getItem("watiraVoiceTestResults") || "{}"
        );
    } catch (error) {
        return {};
    }
}


function saveVoiceTestResult(testId, status, actual) {
    const results = getStoredVoiceTestResults();
    results[testId] = {
        status,
        actual,
        tested_at: new Date().toISOString()
    };
    localStorage.setItem("watiraVoiceTestResults", JSON.stringify(results));
}


function renderVoiceTestCases() {
    const container = document.getElementById("voice-test-cases");
    const savedResults = getStoredVoiceTestResults();
    container.innerHTML = "";

    voiceTestCasesData.forEach((testCase) => {
        const saved = savedResults[testCase.id] || {
            status: "not_run",
            actual: ""
        };
        const card = document.createElement("article");
        card.className = "voice-test-card";

        card.innerHTML = `
            <div class="voice-test-title">
                <span>Test ${testCase.id}</span>
                <strong>${escapeHTML(testCase.scenario)}</strong>
            </div>
            <div class="voice-test-detail">
                <small>Test utterance</small>
                <p>${escapeHTML(testCase.utterance)}</p>
            </div>
            <div class="voice-test-detail">
                <small>Expected result</small>
                <p>${escapeHTML(testCase.expected)}</p>
            </div>
        `;

        const resultArea = document.createElement("div");
        resultArea.className = "voice-test-result";

        const statusSelect = document.createElement("select");
        [
            ["not_run", "Not run"],
            ["passed", "Passed"],
            ["failed", "Failed"]
        ].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            option.selected = saved.status === value;
            statusSelect.appendChild(option);
        });

        const actualInput = document.createElement("textarea");
        actualInput.rows = 2;
        actualInput.placeholder = "Record the actual result or limitation…";
        actualInput.value = saved.actual || "";

        const persist = () => saveVoiceTestResult(
            testCase.id,
            statusSelect.value,
            actualInput.value.trim()
        );

        statusSelect.addEventListener("change", persist);
        actualInput.addEventListener("change", persist);

        resultArea.appendChild(statusSelect);
        resultArea.appendChild(actualInput);
        card.appendChild(resultArea);
        container.appendChild(card);
    });
}


function exportVoiceTestResults() {
    const savedResults = getStoredVoiceTestResults();
    const exportedResults = voiceTestCasesData.map((testCase) => ({
        ...testCase,
        actual_result: savedResults[testCase.id] || {
            status: "not_run",
            actual: "",
            tested_at: null
        }
    }));
    const blob = new Blob(
        [JSON.stringify(exportedResults, null, 2)],
        {type: "application/json"}
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "voice_rag_test_results.json";
    link.click();
    URL.revokeObjectURL(url);
}


voiceSessionButton.addEventListener("click", startVoiceSession);
clearVoiceHistoryButton.addEventListener("click", clearVoiceHistory);
exportVoiceTestsButton.addEventListener("click", exportVoiceTestResults);


// ==========================================
// LOAD SAVED RESULTS ON PAGE LOAD
// ==========================================
