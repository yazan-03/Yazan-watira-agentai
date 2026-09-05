const input = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const chatBox = document.getElementById("chat-box");

let firstMessage = true;


function removeWelcome() {
    if (!firstMessage) return;

    const welcome = document.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }

    firstMessage = false;
}


function addMessage(text, type) {

    removeWelcome();

    const row = document.createElement("div");
    row.className = `message-row ${type}`;

    const message = document.createElement("div");
    message.className = "message";
    message.textContent = text;

    row.appendChild(message);
    chatBox.appendChild(row);

    chatBox.scrollTop = chatBox.scrollHeight;

    return row;
}


function addTypingIndicator() {

    removeWelcome();

    const row = document.createElement("div");
    row.className = "message-row bot";

    const message = document.createElement("div");
    message.className = "message";

    message.innerHTML = `
        <div class="typing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    row.appendChild(message);
    chatBox.appendChild(row);

    chatBox.scrollTop = chatBox.scrollHeight;

    return row;
}


function addRetrievalInfo(sources, ranking) {

    const row = document.createElement("div");
    row.className = "message-row bot";

    const panel = document.createElement("div");
    panel.className = "retrieval-panel";


    // Sources
    const sourceSection = document.createElement("div");
    sourceSection.className = "retrieval-section";

    const sourceTitle = document.createElement("div");
    sourceTitle.className = "retrieval-title";
    sourceTitle.textContent = "Retrieved Sources";

    sourceSection.appendChild(sourceTitle);


    if (sources && sources.length > 0) {

        sources.forEach(source => {

            const item = document.createElement("div");
            item.className = "source-item";

            const icon = document.createElement("span");
            icon.className = "file-icon";
            icon.textContent = "DOC";

            const name = document.createElement("span");
            name.textContent = source;

            item.appendChild(icon);
            item.appendChild(name);

            sourceSection.appendChild(item);
        });
    }


    panel.appendChild(sourceSection);


    // Ranking
    const rankingSection = document.createElement("div");
    rankingSection.className = "retrieval-section ranking-section";

    const rankingTitle = document.createElement("div");
    rankingTitle.className = "retrieval-title";

    rankingTitle.innerHTML = `
        Retrieval Ranking
        <span class="semantic-badge">
            Semantic reranking
        </span>
    `;

    rankingSection.appendChild(rankingTitle);


    if (ranking && ranking.length > 0) {

        ranking.forEach(item => {

            const rankItem = document.createElement("div");
            rankItem.className = "rank-item";

            const rankLeft = document.createElement("div");
            rankLeft.className = "rank-left";

            const rankNumber = document.createElement("div");
            rankNumber.className = "rank-number";
            rankNumber.textContent = item.rank;

            const rankInfo = document.createElement("div");
            rankInfo.className = "rank-info";

            const fileName = document.createElement("div");
            fileName.className = "rank-file";
            fileName.textContent = item.source;

            const chunkId = document.createElement("div");
            chunkId.className = "chunk-id";
            chunkId.textContent = item.id;

            rankInfo.appendChild(fileName);
            rankInfo.appendChild(chunkId);
            
            const viewButton = document.createElement("button");
            viewButton.className = "view-chunk-btn";
            viewButton.textContent = "View retrieved chunk";

            const chunkContent = document.createElement("div");
            chunkContent.className = "chunk-content";
            chunkContent.textContent = item.content;
            chunkContent.style.display = "none";

            viewButton.addEventListener("click", () => {

                const isOpen = chunkContent.style.display === "block";

                chunkContent.style.display = isOpen ? "none" : "block";

                viewButton.textContent = isOpen
                    ? "View retrieved chunk"
                    : "Hide retrieved chunk";
            });

            rankInfo.appendChild(viewButton);
            rankInfo.appendChild(chunkContent);

            rankLeft.appendChild(rankNumber);
            rankLeft.appendChild(rankInfo);


            const scores = document.createElement("div");
            scores.className = "score-group";

            const hybrid = document.createElement("div");
            hybrid.className = "score-box";

            hybrid.innerHTML = `
                <span>Hybrid</span>
                <strong>
                    ${Number(item.hybrid_score).toFixed(4)}
                </strong>
            `;


            const semantic = document.createElement("div");
            semantic.className = "score-box semantic-score";

            semantic.innerHTML = `
                <span>Semantic</span>
                <strong>
                    ${
                        item.semantic_score !== null
                            ? Number(item.semantic_score).toFixed(3)
                            : "N/A"
                    }
                </strong>
            `;


            scores.appendChild(hybrid);
            scores.appendChild(semantic);

            rankItem.appendChild(rankLeft);
            rankItem.appendChild(scores);

            rankingSection.appendChild(rankItem);
        });
    }


    panel.appendChild(rankingSection);

    row.appendChild(panel);

    chatBox.appendChild(row);

    chatBox.scrollTop = chatBox.scrollHeight;
}


async function sendMessage() {

    const question = input.value.trim();

    if (!question) {
        return;
    }

    addMessage(question, "user");

    input.value = "";
    autoResize();

    sendButton.disabled = true;

    const typingIndicator = addTypingIndicator();


    try {

        const response = await fetch("/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: question
            })
        });


        const data = await response.json();

        typingIndicator.remove();


        if (response.ok) {

            addMessage(
                data.answer,
                "bot"
            );

            addRetrievalInfo(
                data.sources,
                data.ranking
            );

        } else {

            addMessage(
                data.error || "Something went wrong.",
                "bot"
            );
        }


    } catch (error) {

        typingIndicator.remove();

        addMessage(
            "Unable to connect to the server.",
            "bot"
        );

    } finally {

        sendButton.disabled = false;
        input.focus();
    }
}


function useSuggestion(text) {

    input.value = text;

    autoResize();

    input.focus();
}


function autoResize() {

    input.style.height = "auto";

    input.style.height =
        Math.min(input.scrollHeight, 140) + "px";
}


sendButton.addEventListener(
    "click",
    sendMessage
);


input.addEventListener(
    "input",
    autoResize
);


input.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();
            sendMessage();
        }
    }
);