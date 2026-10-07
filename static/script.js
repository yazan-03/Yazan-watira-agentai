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

const imageAgentButton =
    document.getElementById("image-agent-button");

const imageAgentPanel =
    document.getElementById("image-agent-panel");

const imageFileInput =
    document.getElementById("image-file-input");

const imagePreview =
    document.getElementById("image-preview");

const imagePreviewContainer =
    document.getElementById("image-preview-container");

const imageQuestionInput =
    document.getElementById("image-question-input");

const imageSendButton =
    document.getElementById("image-send-button");

const clearImageButton =
    document.getElementById("clear-image-button");

const imageMode =
    document.getElementById("image-mode");

const imageOcrRequired =
    document.getElementById("image-ocr-required");

const imageOcrResult =
    document.getElementById("image-ocr-result");

const imageFinalAnswer =
    document.getElementById("image-final-answer");

const imageAnalysisStatus =
    document.getElementById("image-analysis-status");

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
// PAGE NAVIGATION
// ==========================================

const applicationViews = {
    assistant: {
        button: assistantButton,
        title: "Document Assistant",
        subtitle: "Ask questions about your knowledge base"
    },
    evaluation: {
        button: evaluationButton,
        panel: evaluationPanel,
        title: "RAG Evaluation",
        subtitle: "Evaluate your RAG pipeline using TruLens RAG Triad"
    },
    "adaptive-rag": {
        button: adaptiveEvaluationButton,
        panel: adaptiveEvaluationPanel,
        title: "Adaptive RAG Evaluation",
        subtitle: "Evaluate adaptive retrieval, rewriting, reranking and multi-hop RAG"
    },
    "voice-rag": {
        button: voiceAgentButton,
        panel: voiceAgentPanel,
        title: "Voice RAG Agent",
        subtitle: "Arabic / English voice conversation with real-time barge-in"
    },
    "image-ocr": {
        button: imageAgentButton,
        panel: imageAgentPanel,
        title: "Image & OCR Agent",
        subtitle: "Visual understanding with Arabic and English OCR"
    }
};

function showApplicationView(requestedPage, updateUrl = true) {
    const aliases = {
        "image-agent": "image-ocr",
        "image-rag": "image-ocr",
        "adaptive-evaluation": "adaptive-rag",
        "rag-evaluation": "evaluation"
    };
    const requested = aliases[requestedPage] || requestedPage;
    const page = applicationViews[requested] ? requested : "assistant";
    const view = applicationViews[page];

    Object.values(applicationViews).forEach((entry) => {
        entry.panel?.classList.toggle("active", entry === view);
        entry.button.classList.toggle("selected", entry === view);
        entry.button.setAttribute("aria-current", entry === view ? "page" : "false");
    });
    chatBox.style.display = page === "assistant" ? "flex" : "none";
    inputWrapper.style.display = page === "assistant" ? "block" : "none";
    pageTitle.textContent = view.title;
    pageSubtitle.textContent = view.subtitle;

    if (page !== "voice-rag") stopVoiceSession();
    if (page === "adaptive-rag") loadAdaptiveEvaluation();
    if (page === "voice-rag") loadVoiceTestCases();
    if (page === "image-ocr") loadImageTestCases();

    if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set("page", page);
        window.history.replaceState(null, "", url);
    }
}

Object.entries(applicationViews).forEach(([page, view]) => {
    view.button.addEventListener("click", () => showApplicationView(page));
});

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
// IMAGE & OCR AGENT
// ==========================================

let selectedImageFile = null;
let selectedImagePreviewUrl = null;
let imageRequestController = null;
let imageRequestVersion = 0;
let imageTestCasesData = [];
let imageTestsLoadPromise = null;
let imageTestResultsInMemory = {};
const imageTestStorageKey = "watira-image-ocr-test-results-v1";
const maxImageBytes = 10 * 1024 * 1024;
const allowedImageTypes = new Set([
    "image/jpeg", "image/png", "image/webp", "image/gif"
]);

imageFileInput.addEventListener("change", () => {
    const file = imageFileInput.files[0];
    if (!file) return;
    try {
        selectImageFile(file);
    } catch (error) {
        clearSelectedImage();
        imageAnalysisStatus.textContent = "Invalid image";
        imageFinalAnswer.textContent = error.message;
    }
});

imageSendButton.addEventListener("click", analyzeUploadedImage);

imageQuestionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        analyzeUploadedImage();
    }
});

async function analyzeUploadedImage() {
    const question = imageQuestionInput.value.trim();
    if (!selectedImageFile) {
        imageAnalysisStatus.textContent = "Upload an image first";
        return;
    }

    if (!question) {
        imageAnalysisStatus.textContent = "Enter a question";
        imageQuestionInput.focus();
        return;
    }
    if (question.length > 2000) {
        imageAnalysisStatus.textContent = "Question is too long";
        return;
    }
    await requestImageAnalysis(selectedImageFile, question);
}

function cancelImageRequest() {
    imageRequestVersion += 1;
    imageRequestController?.abort();
    imageRequestController = null;
    setImageBusy(false);
}

function setImageBusy(busy) {
    imageSendButton.disabled = busy;
    imageSendButton.textContent = busy ? "Analyzing…" : "Analyze Image";
    document.querySelectorAll(".image-test-run-button").forEach((button) => {
        button.disabled = busy;
    });
}

function resetImageResults() {
    imageMode.textContent = "—";
    imageOcrRequired.textContent = "—";
    document.getElementById("image-has-text").textContent = "—";
    document.getElementById("image-rag-used").textContent = "—";
    document.getElementById("image-decision-reason").textContent = "";
    document.getElementById("image-warnings").replaceChildren();
    document.getElementById("image-warnings").hidden = true;
    document.getElementById("image-sources").replaceChildren();
    document.getElementById("image-sources").hidden = true;
    imageOcrResult.textContent = "No OCR result yet.";
    imageFinalAnswer.textContent = "Upload an image and ask a question to begin.";
}

function selectImageFile(file) {
    if (!allowedImageTypes.has(file.type)) {
        throw new Error("Choose a JPG, PNG, WEBP or GIF image.");
    }
    if (file.size === 0 || file.size > maxImageBytes) {
        throw new Error("The image must contain data and be no larger than 10 MB.");
    }
    cancelImageRequest();
    selectedImageFile = file;
    if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
    selectedImagePreviewUrl = URL.createObjectURL(file);
    imagePreview.src = selectedImagePreviewUrl;
    imagePreviewContainer.style.display = "block";
    resetImageResults();
    imageAnalysisStatus.textContent = "Image selected";
}

function clearSelectedImage() {
    cancelImageRequest();
    selectedImageFile = null;
    imageFileInput.value = "";
    if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
    selectedImagePreviewUrl = null;
    imagePreview.removeAttribute("src");
    imagePreviewContainer.style.display = "none";
    imageQuestionInput.value = "";
    resetImageResults();
    imageAnalysisStatus.textContent = "Ready";
}

async function readImageJsonResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error(response.status === 413
            ? "The image is too large. Choose an image under 10 MB."
            : "The server returned an unexpected response. Check that the application is running.");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Image analysis failed.");
    return data;
}

function renderImageAnalysis(data) {
    imageMode.textContent = data.mode || "—";
    imageOcrRequired.textContent = data.ocr_required ? "Yes" : "No";
    document.getElementById("image-has-text").textContent =
        typeof data.has_text === "boolean" ? (data.has_text ? "Yes" : "No") : "—";
    document.getElementById("image-rag-used").textContent = data.rag_used ? "Yes" : "No";
    document.getElementById("image-decision-reason").textContent = data.decision_reason || "";
    const ocrText = data.ocr_required
        ? (data.ocr_text || "No readable text could be extracted.")
        : "OCR was not required for this question.";
    renderImageOcrText(imageOcrResult, ocrText);
    imageFinalAnswer.textContent = data.answer || "No answer was returned.";
    const statusLabels = {
        supported: "Complete", partial: "Partial answer", unavailable: "Information unavailable"
    };
    imageAnalysisStatus.textContent = statusLabels[data.status] || "Complete";

    const warnings = document.getElementById("image-warnings");
    warnings.replaceChildren();
    const warningItems = Array.isArray(data.warnings) ? data.warnings : [];
    warningItems.forEach((warning) => appendImageText(warnings, "p", String(warning)));
    warnings.hidden = warningItems.length === 0;

    const sources = document.getElementById("image-sources");
    sources.replaceChildren();
    const sourceItems = Array.isArray(data.sources) ? data.sources : [];
    if (sourceItems.length) {
        appendImageText(sources, "strong", "Knowledge base sources");
        sourceItems.forEach((source) => {
            const label = typeof source === "string" ? source
                : (source.title || source.source || source.file_name || source.filename || "Retrieved document");
            appendImageText(sources, "p", label);
        });
    }
    sources.hidden = sourceItems.length === 0;
}

async function requestImageAnalysis(file, question, testCase = null) {
    cancelImageRequest();
    const version = imageRequestVersion;
    const controller = new AbortController();
    imageRequestController = controller;
    const formData = new FormData();
    formData.append("image", file);
    formData.append("message", question);
    setImageBusy(true);
    resetImageResults();
    imageAnalysisStatus.textContent = "Analyzing";
    imageOcrResult.textContent = "Waiting for analysis...";
    imageFinalAnswer.textContent = "Analyzing the uploaded image...";
    const startedAt = Date.now();
    let timedOut = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, 120000);
    try {
        const response = await fetch("/image-chat", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });
        const data = await readImageJsonResponse(response);
        if (version !== imageRequestVersion) return;
        renderImageAnalysis(data);
        if (testCase) {
            saveImageTestResult(testCase.id, {
                ...freshImageTestResult(testCase),
                ...data,
                agent_status: data.status || null,
                status: "not_evaluated",
                checks: null,
                review_status: "not_reviewed",
                actual_result: data.answer || "No answer was returned.",
                errors_or_limitations: (data.warnings || []).join("\n"),
                latency_ms: Date.now() - startedAt,
                tested_at: new Date().toISOString()
            }, true);
            renderImageTestCases();
        }
        return data;
    } catch (error) {
        if (version !== imageRequestVersion) return;
        const message = timedOut ? "Analysis timed out. Try the image again."
            : (error.message || "Image analysis failed.");
        imageAnalysisStatus.textContent = "Error";
        imageOcrResult.textContent = "—";
        imageFinalAnswer.textContent = message;
        if (testCase) {
            saveImageTestResult(testCase.id, {
                ...freshImageTestResult(testCase),
                review_status: "failed",
                actual_result: "Analysis did not complete.",
                errors_or_limitations: message,
                tested_at: new Date().toISOString()
            }, true);
            renderImageTestCases();
        }
    } finally {
        clearTimeout(timeout);
        if (version === imageRequestVersion) {
            imageRequestController = null;
            setImageBusy(false);
        }
    }
}

clearImageButton.addEventListener("click", clearSelectedImage);

function appendImageText(parent, tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text ?? "";
    element.dir = "auto";
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
}

function renderImageOcrText(element, text) {
    const transcript = String(text ?? "");
    const tokens = /[A-Za-z0-9\u0660-\u0669\u06f0-\u06f9]+(?:[-/][A-Za-z0-9\u0660-\u0669\u06f0-\u06f9]+)+/g;
    element.replaceChildren();
    let position = 0;
    for (const match of transcript.matchAll(tokens)) {
        element.appendChild(document.createTextNode(transcript.slice(position, match.index)));
        const isolated = document.createElement("bdi");
        isolated.dir = "ltr";
        isolated.textContent = match[0];
        element.appendChild(isolated);
        position = match.index + match[0].length;
    }
    element.appendChild(document.createTextNode(transcript.slice(position)));
}

function getImageTestResults() {
    try {
        const results = JSON.parse(localStorage.getItem(imageTestStorageKey) || "{}");
        const stored = results && typeof results === "object" && !Array.isArray(results) ? results : {};
        return {...stored, ...imageTestResultsInMemory};
    } catch {
        return {...imageTestResultsInMemory};
    }
}

function freshImageTestResult(testCase) {
    return {
        status: "not_evaluated",
        agent_status: null,
        checks: null,
        review_status: "not_reviewed",
        reviewed_at: null,
        answer: null,
        agent_final_answer: null,
        ocr_text: null,
        ocr_result: null,
        ocr_required: null,
        has_text: null,
        mode: null,
        rag_used: null,
        sources: [],
        warnings: [],
        decision_reason: null,
        latency_ms: null,
        tested_at: null,
        actual_result: "",
        errors_or_limitations: "",
        uploaded_image: testCase.image,
        user_question: testCase.question
    };
}

function saveImageTestResult(id, result, replace = false) {
    const results = getImageTestResults();
    results[id] = replace ? result : {...results[id], ...result};
    imageTestResultsInMemory = results;
    try {
        localStorage.setItem(imageTestStorageKey, JSON.stringify(results));
    } catch {
        document.getElementById("image-tests-notice").textContent =
            "Browser storage is unavailable. Export your results before leaving the page.";
    }
}

async function loadImageTestCases() {
    if (imageTestCasesData.length) return;
    if (imageTestsLoadPromise) return imageTestsLoadPromise;
    imageTestsLoadPromise = (async () => {
        const container = document.getElementById("image-test-cases");
        try {
            const response = await fetch("/image-test-cases");
            const data = await readImageJsonResponse(response);
            if (!Array.isArray(data.test_cases) || data.test_cases.length !== 8) {
                throw new Error("The image task requires exactly 8 test cases.");
            }
            imageTestCasesData = data.test_cases;
            // Saved server runs are optional; browser reviews stay authoritative.
            try {
                const resultsResponse = await fetch("/image-test-results");
                if (resultsResponse.ok) {
                    const payload = await resultsResponse.json();
                    const stored = getImageTestResults();
                    (Array.isArray(payload.results) ? payload.results : []).forEach((result) => {
                        const id = result.id ?? result.test_id ?? result.test;
                        if (id != null && !stored[id]) {
                            saveImageTestResult(id, {...result, review_status: "not_reviewed"});
                        }
                    });
                }
            } catch {
                // Test cases remain usable even when no saved server run exists.
            }
            renderImageTestCases();
        } catch (error) {
            container.replaceChildren();
            appendImageText(container, "p", error.message, "evaluation-empty");
        } finally {
            imageTestsLoadPromise = null;
        }
    })();
    return imageTestsLoadPromise;
}

function appendImageTestDetail(parent, label, value, isOcr = false) {
    const section = document.createElement("div");
    section.className = "image-test-detail";
    appendImageText(section, "strong", label);
    const content = appendImageText(section, "p", value || "—");
    if (isOcr) renderImageOcrText(content, value || "—");
    parent.appendChild(section);
}

function renderImageTestCases() {
    const container = document.getElementById("image-test-cases");
    container.replaceChildren();
    const results = getImageTestResults();
    imageTestCasesData.forEach((testCase) => {
        const saved = results[testCase.id] || {};
        const card = document.createElement("article");
        card.className = "image-test-card";
        const heading = document.createElement("div");
        heading.className = "image-test-heading";
        appendImageText(heading, "h4", `Test ${testCase.id}: ${testCase.scenario}`);
        const runButton = appendImageText(heading, "button", "Run Case", "image-test-run-button secondary-button");
        runButton.type = "button";
        runButton.disabled = Boolean(imageRequestController);
        runButton.addEventListener("click", () => runImageTestCase(testCase));
        card.appendChild(heading);
        const fixture = document.createElement("img");
        fixture.src = testCase.image;
        fixture.alt = `Uploaded test image: ${testCase.scenario}`;
        fixture.loading = "lazy";
        fixture.className = "image-test-fixture";
        card.appendChild(fixture);
        appendImageTestDetail(card, "User question", testCase.question);
        appendImageTestDetail(card, "Expected result", testCase.expected);
        if (testCase.expected_ocr) appendImageTestDetail(card, "Expected OCR text", testCase.expected_ocr, true);
        appendImageTestDetail(card, "OCR result", saved.ocr_required === false
            ? "Not required" : (saved.ocr_text || saved.ocr_result || "Not run yet"), true);
        appendImageTestDetail(card, "Agent's final answer", saved.answer || saved.agent_final_answer || "Not run yet");
        if (saved.status === "passed" || saved.status === "failed") {
            appendImageTestDetail(card, "Automated checks", `${saved.status === "passed" ? "Passed" : "Failed"} — review the answer separately.`);
        }
        if (saved.checks) {
            const checks = Array.isArray(saved.checks)
                ? saved.checks.map((check) => typeof check === "string" ? check : JSON.stringify(check)).join("\n")
                : JSON.stringify(saved.checks, null, 2);
            appendImageTestDetail(card, "Check details", checks);
        }
        if (saved.mode) {
            appendImageTestDetail(card, "Observed pipeline", `${saved.mode} · OCR: ${saved.ocr_required ? "Yes" : "No"} · RAG: ${saved.rag_used ? "Yes" : "No"}`);
        }
        const review = document.createElement("div");
        review.className = "image-test-review";
        const statusLabel = document.createElement("label");
        appendImageText(statusLabel, "span", "Review result");
        const status = document.createElement("select");
        [["not_reviewed", "Not reviewed"], ["passed", "Passed"], ["failed", "Failed"]].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            status.appendChild(option);
        });
        status.value = saved.review_status || "not_reviewed";
        statusLabel.appendChild(status);
        review.appendChild(statusLabel);
        const actualLabel = document.createElement("label");
        appendImageText(actualLabel, "span", "Actual result / review notes");
        const actual = document.createElement("textarea");
        actual.rows = 3;
        actual.dir = "auto";
        actual.value = saved.actual_result || "";
        actual.placeholder = "Compare the actual answer with the expected result.";
        actualLabel.appendChild(actual);
        review.appendChild(actualLabel);
        const errorsLabel = document.createElement("label");
        appendImageText(errorsLabel, "span", "Errors or limitations");
        const errors = document.createElement("textarea");
        errors.rows = 2;
        errors.dir = "auto";
        errors.value = saved.errors_or_limitations || (Array.isArray(saved.warnings) ? saved.warnings.join("\n") : "");
        errors.placeholder = "Unreadable text, missing information, service error, or other limitations.";
        errorsLabel.appendChild(errors);
        review.appendChild(errorsLabel);
        const saveReview = () => saveImageTestResult(testCase.id, {
            review_status: status.value,
            actual_result: actual.value,
            errors_or_limitations: errors.value,
            reviewed_at: new Date().toISOString()
        });
        status.addEventListener("change", saveReview);
        actual.addEventListener("input", saveReview);
        errors.addEventListener("input", saveReview);
        card.appendChild(review);
        container.appendChild(card);
    });
}

async function runImageTestCase(testCase) {
    cancelImageRequest();
    const version = imageRequestVersion;
    const controller = new AbortController();
    imageRequestController = controller;
    saveImageTestResult(testCase.id, {
        ...freshImageTestResult(testCase), actual_result: "Test is running."
    }, true);
    renderImageTestCases();
    setImageBusy(true);
    imageAnalysisStatus.textContent = "Loading test image";
    try {
        const response = await fetch(testCase.image, {signal: controller.signal});
        if (!response.ok) throw new Error("The bundled test image could not be loaded.");
        const blob = await response.blob();
        if (version !== imageRequestVersion) return;
        const filename = testCase.image.split("/").pop() || `image-test-${testCase.id}.png`;
        const file = new File([blob], filename, {type: blob.type});
        selectImageFile(file);
        imageQuestionInput.value = testCase.question;
        await requestImageAnalysis(file, testCase.question, testCase);
    } catch (error) {
        if (version !== imageRequestVersion || error.name === "AbortError") return;
        imageAnalysisStatus.textContent = "Error";
        imageFinalAnswer.textContent = error.message;
        saveImageTestResult(testCase.id, {
            ...freshImageTestResult(testCase),
            review_status: "failed", actual_result: "Test could not run.",
            errors_or_limitations: error.message, tested_at: new Date().toISOString()
        }, true);
        renderImageTestCases();
    } finally {
        if (version === imageRequestVersion) {
            imageRequestController = null;
            setImageBusy(false);
        }
    }
}

function exportImageTestResults() {
    if (imageTestCasesData.length !== 8) {
        document.getElementById("image-tests-notice").textContent = "Load all 8 test cases before exporting.";
        return;
    }
    const results = getImageTestResults();
    const output = imageTestCasesData.map((testCase) => {
        const saved = results[testCase.id] || {};
        return {
            ...testCase,
            uploaded_image: testCase.image,
            user_question: testCase.question,
            expected_result: testCase.expected,
            ocr_result: saved.ocr_text ?? saved.ocr_result ?? null,
            agent_final_answer: saved.answer || saved.agent_final_answer || null,
            actual_result: saved.actual_result || "Not run yet",
            errors_or_limitations: saved.errors_or_limitations || "",
            review_status: saved.review_status || "not_reviewed",
            automated_status: saved.status === "passed" || saved.status === "failed" ? saved.status : null,
            automated_checks: saved.checks || null,
            agent_status: saved.agent_status || (["supported", "partial", "unavailable"].includes(saved.status) ? saved.status : null),
            observed_mode: saved.mode || null,
            ocr_required: saved.ocr_required ?? null,
            rag_used: saved.rag_used ?? null,
            sources: saved.sources || [],
            tested_at: saved.tested_at || null,
            latency_ms: saved.latency_ms ?? null
        };
    });
    const blob = new Blob([JSON.stringify({exported_at: new Date().toISOString(), results: output}, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "image_ocr_test_results.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById("export-image-tests-button").addEventListener("click", exportImageTestResults);
window.addEventListener("beforeunload", () => {
    imageRequestController?.abort();
    if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
});


// ==========================================
// LOAD SAVED RESULTS ON PAGE LOAD
// ==========================================

showApplicationView(new URLSearchParams(window.location.search).get("page") || "assistant", false);
