"""SQLAlchemy engine, session factory, and ORM models for the parking lot schema."""

import os
from contextlib import contextmanager
from datetime import datetime
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import Enum, ForeignKey, String, create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

load_dotenv()

DB_HOST = os.getenv("DB_HOST") or "localhost"
DB_PORT = int(os.getenv("DB_PORT") or "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "parking_lot")

DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Slot(Base):
    __tablename__ = "slots"

    slot_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    zone: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("free", "occupied", "reserved", name="slot_status"), nullable=False, default="free"
    )
    reserved_by: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reserved_until: Mapped[datetime | None] = mapped_column(nullable=True)

    reservations: Mapped[list["Reservation"]] = relationship(back_populates="slot")


class Reservation(Base):
    __tablename__ = "reservations"

    reservation_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    slot_id: Mapped[str] = mapped_column(ForeignKey("slots.slot_id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[datetime] = mapped_column(nullable=False)
    end_time: Mapped[datetime] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "completed", "cancelled", name="reservation_status"), nullable=False, default="active"
    )

    slot: Mapped["Slot"] = relationship(back_populates="reservations")


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy session, committing on success and closing always."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
