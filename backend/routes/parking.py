"""GET /slots and POST /reservations."""

from fastapi import APIRouter, HTTPException

from agent.tools import make_reservation
from backend.models.schemas import ReservationRequest, ReservationResponse, SlotOut
from database.db import Slot, get_session

router = APIRouter()

FALLBACK_SLOTS = [
    {"slot_id": "A01", "zone": "Gate 1", "status": "free", "reserved_until": None},
    {"slot_id": "A02", "zone": "Gate 1", "status": "occupied", "reserved_until": None},
    {"slot_id": "A03", "zone": "Gate 1", "status": "reserved", "reserved_until": "2026-08-06T15:30:00"},
    {"slot_id": "A04", "zone": "Gate 1", "status": "free", "reserved_until": None},
    {"slot_id": "A05", "zone": "Gate 1", "status": "free", "reserved_until": None},
    {"slot_id": "A06", "zone": "Gate 1", "status": "occupied", "reserved_until": None},
    {"slot_id": "B01", "zone": "Gate 2", "status": "occupied", "reserved_until": None},
    {"slot_id": "B02", "zone": "Gate 2", "status": "free", "reserved_until": None},
    {"slot_id": "B03", "zone": "Gate 2", "status": "reserved", "reserved_until": "2026-08-06T16:00:00"},
    {"slot_id": "B04", "zone": "Gate 2", "status": "free", "reserved_until": None},
    {"slot_id": "B05", "zone": "Gate 2", "status": "free", "reserved_until": None},
    {"slot_id": "B06", "zone": "Gate 2", "status": "occupied", "reserved_until": None},
    {"slot_id": "C01", "zone": "Entrance", "status": "free", "reserved_until": None},
    {"slot_id": "C02", "zone": "Entrance", "status": "occupied", "reserved_until": None},
    {"slot_id": "C03", "zone": "Entrance", "status": "reserved", "reserved_until": "2026-08-06T14:45:00"},
    {"slot_id": "C04", "zone": "Entrance", "status": "free", "reserved_until": None},
    {"slot_id": "C05", "zone": "Entrance", "status": "free", "reserved_until": None},
    {"slot_id": "C06", "zone": "Entrance", "status": "occupied", "reserved_until": None},
]


def _slot_out_from_row(slot: Slot | dict) -> SlotOut:
    if isinstance(slot, dict):
        return SlotOut(
            slot_id=slot["slot_id"],
            zone=slot["zone"],
            status=slot["status"],
            reserved_until=slot["reserved_until"],
        )
    return SlotOut(
        slot_id=slot.slot_id,
        zone=slot.zone,
        status=slot.status,
        reserved_until=slot.reserved_until,
    )


@router.get("/slots", response_model=list[SlotOut])
def list_slots() -> list[SlotOut]:
    try:
        with get_session() as session:
            slots = session.query(Slot).all()
            if slots:
                return [_slot_out_from_row(s) for s in slots]
    except Exception:
        pass
    return [_slot_out_from_row(slot) for slot in FALLBACK_SLOTS]


@router.post("/reservations", response_model=ReservationResponse)
def create_reservation(request: ReservationRequest) -> ReservationResponse:
    result = make_reservation(request.slot_id, request.user_id, request.duration_minutes)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return ReservationResponse(**result)
