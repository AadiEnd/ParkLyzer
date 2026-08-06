"""FastAPI app entry point."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.routes import auth, chat, parking

load_dotenv()

app = FastAPI(title="Parking Lot AI Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "parklyzer-session-secret"),
    max_age=60 * 60 * 24 * 7,
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(parking.router)
