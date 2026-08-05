"""GET /slots and POST /reservations."""

from fastapi import APIRouter, HTTPException

from agent.tools import make_reservation
from backend.models.schemas import ReservationRequest, ReservationResponse, SlotOut
from database.db import Slot, get_session

router = APIRouter()


@router.get("/slots", response_model=list[SlotOut])
def list_slots() -> list[SlotOut]:
    with get_session() as session:
        slots = session.query(Slot).all()
        return [
            SlotOut(slot_id=s.slot_id, zone=s.zone, status=s.status, reserved_until=s.reserved_until)
            for s in slots
        ]


@router.post("/reservations", response_model=ReservationResponse)
def create_reservation(request: ReservationRequest) -> ReservationResponse:
    result = make_reservation(request.slot_id, request.user_id, request.duration_minutes)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return ReservationResponse(**result)
