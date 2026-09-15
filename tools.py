from search_service import hybrid_search
import uuid


def rag_search(query: str):
    """
    Search the knowledge base using Azure AI Search
    and return the most relevant chunks and sources.
    """

    results = hybrid_search(
        question=query,
        top_k=3
    )

    retrieved = []

    for result in results:
        retrieved.append({
            "id": result["id"],
            "source": result["source"],
            "content": result["content"],
            "hybrid_score": result["score"],
            "semantic_score": result["reranker_score"]
        })

    return retrieved

def calculator(expression: str):
    """
    Perform a mathematical calculation.
    Example: "25 - 8"
    """

    try:
        result = eval(expression, {"__builtins__": {}}, {})
        return {
            "expression": expression,
            "result": result
        }

    except Exception:
        return {
            "error": "Invalid mathematical expression."
        }


def create_ticket(title: str, description: str, priority: str = "medium"):
    """
    Create a mock support ticket.
    """

    ticket_id = f"TKT-{str(uuid.uuid4())[:8].upper()}"

    ticket = {
        "ticket_id": ticket_id,
        "title": title,
        "description": description,
        "priority": priority,
        "status": "Created"
    }

    return ticket


def create_calendar_event(
    title: str,
    date: str,
    time: str,
    duration_minutes: int = 30
):
    """
    Create a mock calendar event.
    """

    event = {
        "title": title,
        "date": date,
        "time": time,
        "duration_minutes": duration_minutes,
        "status": "Scheduled"
    }

    return event


def send_email(
    recipient: str,
    subject: str,
    body: str
):
    """
    Send a mock email.
    """

    email = {
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "status": "Sent"
    }

    return email