"""LangGraph agent for the parking lot assistant.

Only `run_agent` is meant to be imported by other modules.
"""

import os

from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from agent.tools import cancel_reservation, check_availability, make_reservation

load_dotenv()

_SYSTEM_PROMPT = """You are a helpful parking lot assistant for a small parking lot with \
3 zones: "Gate 1", "Gate 2", and "Entrance" (6 slots each).

You have three tools: check_availability, make_reservation, and cancel_reservation.

Rules:
- Use check_availability before booking if you don't already know a free slot_id.
- If the user's request is ambiguous (e.g. no zone/duration given), ask a short
  clarifying question instead of guessing.
- If the user refines a previous request (e.g. "something closer to the entrance
  instead"), use the conversation history to understand what they're changing.
- If make_reservation returns an error (e.g. the slot was taken in the meantime),
  do not fail silently — call check_availability again and offer the user
  alternative free slots.
- If the user wants to change or cancel a reservation made earlier in this
  conversation, use the reservation_id from that earlier tool result.
- Keep replies short and conversational.
"""

_llm = ChatGoogleGenerativeAI(
    model="gemini-flash-latest",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0,
)

_checkpointer = MemorySaver()


def _build_agent(user_id: str):
    """Build a react agent whose make_reservation tool has user_id baked in,
    so the LLM never has to guess or ask for it."""

    def _make_reservation(slot_id: str, duration_minutes: int) -> dict:
        """Reserve a specific parking slot for the current user, if it is free.

        Args:
            slot_id: The ID of the slot to reserve, e.g. "G1-3".
            duration_minutes: How long the reservation should last, in minutes.
        """
        return make_reservation(slot_id, user_id, duration_minutes)

    tools = [tool(check_availability), tool(_make_reservation), tool(cancel_reservation)]
    return create_react_agent(_llm, tools=tools, prompt=_SYSTEM_PROMPT, checkpointer=_checkpointer)


def run_agent(user_id: str, message: str) -> str:
    """Send a user message to the parking assistant and get its reply.

    Conversation history is kept in memory per user_id, so follow-up and
    multi-turn messages from the same user_id retain prior context.

    Args:
        user_id: Identifier for the user/conversation.
        message: The user's message text.

    Returns:
        The agent's reply as plain text.
    """
    agent = _build_agent(user_id)
    config = {"configurable": {"thread_id": user_id}}
    result = agent.invoke({"messages": [{"role": "user", "content": message}]}, config=config)
    content = result["messages"][-1].content
    if isinstance(content, str):
        return content
    return "".join(part["text"] for part in content if isinstance(part, dict) and part.get("type") == "text")
