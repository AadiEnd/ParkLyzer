"""POST /chat — routes messages to the LangGraph agent."""

from fastapi import APIRouter

from agent.graph import run_agent
from backend.models.schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    reply = run_agent(request.user_id, request.message)
    return ChatResponse(reply=reply)
