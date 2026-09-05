# Watira AI – GenAI Knowledge Assistant

Watira AI is a Retrieval-Augmented Generation (RAG) application that answers user questions based on a collection of Word documents.

The system uses Azure AI Search for document retrieval, Azure OpenAI for embeddings and answer generation, Flask for the backend API, and a simple web interface for user interaction.

## Architecture

```text
Word Documents
      ↓
Text Extraction
      ↓
Chunking
      ↓
Azure OpenAI Embeddings
      ↓
Azure AI Search Index
      ↓
User Question
      ↓
Question Embedding
      ↓
Hybrid Search
(Keyword + Vector Search)
      ↓
Semantic Reranking
      ↓
Relevant Document Chunks
      ↓
Azure OpenAI
      ↓
Grounded Answer
      ↓
Flask API
      ↓
Web Chat Interface
```

## Features

- Retrieval-Augmented Generation (RAG)
- Word document indexing
- Text chunking with paragraph overlap
- Azure OpenAI embeddings
- Azure AI Search vector storage and retrieval
- Hybrid Search using keyword and vector search
- Semantic reranking
- Grounded answer generation
- Protection against unsupported answers
- Retrieved source display
- Hybrid and semantic ranking scores
- Retrieved chunk inspection
- Simple responsive chat interface

## Knowledge Base

The application currently uses five Word documents covering:

- Moringa Tea
- Deep Learning
- Beginner Gardening
- Italian Coffee Culture
- Yoga

## Technologies

- Python
- Flask
- Azure AI Search
- Azure OpenAI
- OpenAI Python SDK
- python-docx
- HTML
- CSS
- JavaScript

## Project Structure

```text
Watira/
│
├── documents/
│   ├── 1_Moringa_Tea_Health_Guide.docx
│   ├── 2_Deep_Learning_Basics.docx
│   ├── 3_Beginners_Guide_to_Gardening.docx
│   ├── 4_Italian_Coffee_Culture.docx
│   └── 5_Introduction_to_Yoga.docx
│
├── templates/
│   └── index.html
│
├── static/
│   ├── style.css
│   └── script.js
│
├── app.py
├── search_service.py
├── openai_service.py
├── rag_service.py
├── clear_index.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Environment Variables

Create a `.env` file based on `.env.example` and provide the required Azure credentials and deployment names.

Never commit API keys or other secrets to source control.

## Installation

Create and activate a Python virtual environment, then install the dependencies:

```bash
pip install -r requirements.txt
```

## Running the Application

Start the Flask application:

```bash
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

## Retrieval Strategy

The application uses Hybrid Search by combining:

1. Keyword search for lexical matches.
2. Vector search for semantic similarity.

Azure AI Search Semantic Ranking is then used to rerank the retrieved results according to their relevance to the user's question.

The hybrid search score is a ranking score and should not be interpreted as a percentage.

## Grounding

The language model is instructed to answer only using information supported by the retrieved document context.

If only part of a question is supported, the system answers the supported portion and identifies the missing information.

If no relevant information is available, the assistant responds that the information could not be found in the provided documents.

## Example

**Question:**

> How does a deep learning model learn during training?

**Answer:**

> During training, a deep learning model learns through three repeated steps: a forward pass to generate a guess, loss calculation to measure the error between the prediction and the actual target, and backpropagation to adjust internal weights and reduce errors on the next attempt.

## Author

Yazan