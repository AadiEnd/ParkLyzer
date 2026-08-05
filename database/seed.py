"""Create tables and seed the 18 static parking slots. Idempotent — safe to re-run."""

from database.db import Base, Slot, engine, get_session


def seed() -> None:
    Base.metadata.create_all(engine)

    zones = {"Gate 1": "G1", "Gate 2": "G2", "Entrance": "E"}
    created, skipped = 0, 0

    with get_session() as session:
        for zone, prefix in zones.items():
            for i in range(1, 7):
                slot_id = f"{prefix}-{i}"
                if session.get(Slot, slot_id) is not None:
                    skipped += 1
                    continue
                session.add(Slot(slot_id=slot_id, zone=zone, status="free"))
                created += 1

    print(f"Seed complete: {created} slot(s) created, {skipped} already existed.")


if __name__ == "__main__":
    seed()
