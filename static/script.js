// ==========================================
// DOM ELEMENTS
// ==========================================

const assistantButton = document.getElementById("assistant-button");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const inputWrapper = document.getElementById("chat-input-wrapper");

const evaluationButton = document.getElementById("evaluation-button");
const evaluationPanel = document.getElementById("evaluation-panel");
const runEvaluationButton = document.getElementById("run-evaluation-button");

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

        // Hide evaluation
        evaluationPanel.classList.remove("active");

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

        // Show evaluation
        evaluationPanel.classList.add("active");

        // Change page title
        pageTitle.textContent =
            "RAG Evaluation";

        pageSubtitle.textContent =
            "Evaluate your RAG pipeline using TruLens RAG Triad";
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

