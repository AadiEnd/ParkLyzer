"""Parking lot tools exposed to the LangGraph agent."""

import uuid
from datetime import datetime, timedelta

from database.db import Reservation, Slot, get_session


def check_availability(zone: str | None = None) -> list[dict]:
    """Look up currently free parking slots, optionally filtered to a single zone.

    Args:
        zone: Zone name to filter by, e.g. "Gate 1", "Gate 2", or "Entrance".
            Omit or pass None to check all zones.

    Returns:
        A list of dicts, one per free slot: {slot_id, zone, status}.
    """
    with get_session() as session:
        query = session.query(Slot).filter(Slot.status == "free")
        if zone:
            query = query.filter(Slot.zone == zone)
        slots = query.all()
        return [{"slot_id": s.slot_id, "zone": s.zone, "status": s.status} for s in slots]


def make_reservation(slot_id: str, user_id: str, duration_minutes: int) -> dict:
    """Reserve a specific parking slot for a user, if it is currently free.

    Args:
        slot_id: The ID of the slot to reserve, e.g. "G1-3".
        user_id: The ID of the user making the reservation.
        duration_minutes: How long the reservation should last, in minutes.

    Returns:
        On success: {reservation_id, slot_id, end_time}.
        On failure: {error: <message>} — e.g. slot not found or already taken.
    """
    with get_session() as session:
        slot = session.get(Slot, slot_id)
        if slot is None:
            return {"error": f"Slot '{slot_id}' does not exist."}
        if slot.status != "free":
            return {"error": f"Slot '{slot_id}' is not available (status: {slot.status})."}

        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=duration_minutes)
        reservation_id = str(uuid.uuid4())

        slot.status = "reserved"
        slot.reserved_by = user_id
        slot.reserved_until = end_time

        session.add(
            Reservation(
                reservation_id=reservation_id,
                slot_id=slot_id,
                user_id=user_id,
                start_time=start_time,
                end_time=end_time,
                status="active",
            )
        )

        return {"reservation_id": reservation_id, "slot_id": slot_id, "end_time": end_time.isoformat()}


def cancel_reservation(reservation_id: str) -> dict:
    """Cancel an existing reservation and free up its slot.

    Args:
        reservation_id: The ID of the reservation to cancel.

    Returns:
        {success: True, message: ...} on success, or {error: <message>} if the
        reservation does not exist or is already cancelled/completed.
    """
    with get_session() as session:
        reservation = session.get(Reservation, reservation_id)
        if reservation is None:
            return {"error": f"Reservation '{reservation_id}' does not exist."}
        if reservation.status != "active":
            return {"error": f"Reservation '{reservation_id}' is already {reservation.status}."}

        reservation.status = "cancelled"

        slot = session.get(Slot, reservation.slot_id)
        if slot is not None:
            slot.status = "free"
            slot.reserved_by = None
            slot.reserved_until = None

        return {"success": True, "message": f"Reservation '{reservation_id}' cancelled."}
