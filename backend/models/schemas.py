"""Pydantic request/response schemas matching the API contract in CLAUDE.md."""

from datetime import datetime

from pydantic import BaseModel


class ChatRequest(BaseModel):
    user_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str


class SlotOut(BaseModel):
    slot_id: str
    zone: str
    status: str
    reserved_until: datetime | None


class ReservationRequest(BaseModel):
    slot_id: str
    user_id: str
    duration_minutes: int


class ReservationResponse(BaseModel):
    reservation_id: str
    slot_id: str
    end_time: str
