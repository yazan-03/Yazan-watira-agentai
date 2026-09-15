import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

from tools import (
    rag_search,
    calculator,
    create_ticket,
    create_calendar_event,
    send_email
)

load_dotenv()

OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
GPT_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")

client = AzureOpenAI(
    api_key=OPENAI_KEY,
    azure_endpoint=OPENAI_ENDPOINT,
    api_version="2024-02-01"
)

tool_definitions = [
    {
        "type": "function",
        "function": {
            "name": "rag_search",
            "description": "Search the knowledge base for relevant information from the indexed documents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The information or question to search for in the knowledge base."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Perform a mathematical calculation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The mathematical expression to calculate, for example: 25 - 8."
                    }
                },
                "required": ["expression"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_ticket",
            "description": "Create a mock support ticket for a reported issue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string"
                    },
                    "description": {
                        "type": "string"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"]
                    }
                },
                "required": ["title", "description"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_calendar_event",
            "description": "Create a calendar event or schedule an appointment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string"
                    },
                    "date": {
                        "type": "string",
                        "description": "Event date in YYYY-MM-DD format."
                    },
                    "time": {
                        "type": "string",
                        "description": "Event time in HH:MM format."
                    },
                    "duration_minutes": {
                        "type": "integer"
                    }
                },
                "required": ["title", "date", "time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description":     "Send a mock email to a recipient. "
                                "Write a clear and professional email body. "
                                "add placeholder signatures Yazan.",
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient": {
                        "type": "string"
                    },
                    "subject": {
                        "type": "string"
                    },
                    "body": {
                        "type": "string"
                    }
                },
                "required": ["recipient", "subject", "body"]
            }
        }
    }
]

def execute_tool(tool_name, arguments):
    if tool_name == "rag_search":
        return rag_search(**arguments)

    elif tool_name == "calculator":
        return calculator(**arguments)

    elif tool_name == "create_ticket":
        return create_ticket(**arguments)

    elif tool_name == "create_calendar_event":
        return create_calendar_event(**arguments)

    elif tool_name == "send_email":
        return send_email(**arguments)

    else:
        return {"error": f"Unknown tool: {tool_name}"}


def run_agent(user_message):
    messages = [
        {
            "role": "system",
            "content": """
You are an AI agent with access to several tools.

Rules:

1. For any question that asks for factual information that may be available
   in the knowledge base, you MUST use the rag_search tool before answering.

2. Answer knowledge-base questions only from information returned by rag_search.

3. Do not use your own knowledge to answer knowledge-base questions.

4. Use the calculator tool when mathematical calculations are required.

5. Use create_ticket when the user requests a support ticket.

6. Use create_calendar_event when the user requests scheduling.

7. Use send_email when the user requests an email.

8. A request may require multiple tools. Use the tools step by step as needed.

9. Do not claim that an action was completed unless the corresponding tool
   was successfully executed.

10. If retrieved information contains a numeric range, do not choose, average,
    or infer a single value unless the user explicitly asks for an average or midpoint.

    When a calculation depends on a range, use the calculator tool to calculate
    both the minimum and maximum values and report the full resulting range.

11. Never perform arithmetic yourself.

    Use the calculator tool for every arithmetic calculation needed in the final answer.
12. When rag_search is used, the final answer must always include a clear
    user-facing answer based on the retrieved knowledge-base information.

13. Tool actions such as email, calendar, or ticket creation should be reported
    after the knowledge-base answer, not replace it.

14. Do not use raw retrieved chunks as the final answer. Summarize them clearly
    for the user, while staying grounded in the retrieved context.
"""
        },
        {
            "role": "user",
            "content": user_message
        }
    ]

    # NEW: containers for UI data
    tool_trace = []
    sources = []
    ranking = []

    response = client.chat.completions.create(
        model=GPT_DEPLOYMENT,
        messages=messages,
        tools=tool_definitions,
        tool_choice="auto"
    )

    assistant_message = response.choices[0].message
    messages.append(assistant_message)

    while assistant_message.tool_calls:

        for tool_call in assistant_message.tool_calls:
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            print(f"Agent selected tool: {tool_name}")
            print(f"Arguments: {arguments}")

            try:
                tool_result = execute_tool(
                    tool_name,
                    arguments
                )

            except Exception as e:
                tool_result = {
                    "error": str(e)
                }

            # NEW: save tool execution for UI
            tool_trace.append({
                "tool": tool_name,
                "arguments": arguments,
                "result": tool_result
            })

            # NEW: if RAG Search was used, collect sources/ranking
            if tool_name == "rag_search" and isinstance(tool_result, list):

                for position, result in enumerate(tool_result, start=1):

                    source = result.get("source")

                    if source and source not in sources:
                        sources.append(source)

                    ranking.append({
                        "rank": position,
                        "source": source,
                        "id": result.get("id"),
                        "hybrid_score": result.get("hybrid_score"),
                        "semantic_score": result.get("semantic_score"),
                        "content": result.get("content")
                    })

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(
                    tool_result,
                    ensure_ascii=False
                )
            })

        response = client.chat.completions.create(
            model=GPT_DEPLOYMENT,
            messages=messages,
            tools=tool_definitions,
            tool_choice="auto"
        )

        assistant_message = response.choices[0].message
        messages.append(assistant_message)

    return {
        "answer": assistant_message.content,
        "tool_trace": tool_trace,
        "sources": sources,
        "ranking": ranking
    }

    while assistant_message.tool_calls:

        for tool_call in assistant_message.tool_calls:
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            print(f"Agent selected tool: {tool_name}")
            print(f"Arguments: {arguments}")

            try:
                tool_result = execute_tool(
                    tool_name,
                    arguments
                )
            except Exception as e:
                tool_result = {
                    "error": str(e)
                }

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(
                    tool_result,
                    ensure_ascii=False
                )
            })

        response = client.chat.completions.create(
            model=GPT_DEPLOYMENT,
            messages=messages,
            tools=tool_definitions,
            tool_choice="auto"
        )

        assistant_message = response.choices[0].message
        messages.append(assistant_message)

    return assistant_message.content    