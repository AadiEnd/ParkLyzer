# Parking Lot AI Assistant — Project Rules
 
College major project, team of 4-5. Prototype/demo quality, not production.
 
## Stack (fixed — never substitute)
- Backend: Python + FastAPI
- DB: MySQL (SQLAlchemy + PyMySQL). Never SQLite/Mongo/Postgres.
- Agent: LangChain + LangGraph
- LLM: Gemini free tier (`langchain-google-genai`) primary, Ollama fallback.
  NEVER use Anthropic/Claude API for the app itself (no budget).
- Frontend: React (Vite), plain REST fetch/polling. No Next.js, no WebSockets.
- Env vars via `.env` (python-dotenv) — never hardcode secrets/keys.
## Out of scope — do not build or suggest
CV/camera detection, IoT sensors, WebSockets, payment gateway, auth/login
system, cloud deployment, load balancing — unless I explicitly ask.
 
## Schema
```sql
slots(slot_id PK, zone, status ENUM('free','occupied','reserved'), reserved_by, reserved_until)
reservations(reservation_id PK, slot_id FK, user_id, start_time, end_time, status ENUM('active','completed','cancelled'))
```
Static seed data, 18 slots, 3 zones (Gate 1, Gate 2, Entrance — 6 each). No sensors.
 
## Structure
```
project/
├── database/       db.py, seed.py                             (shared, root-level)
├── agent/          tools.py, graph.py, test_cli.py             (shared, root-level)
├── backend/        main.py, models/schemas.py, routes/{chat.py,parking.py}
└── frontend/parking-frontend/  src/components/{ChatWindow,SlotGrid}.jsx, src/api/client.js
```
`database/` and `agent/` live at project root — NOT inside `backend/`.
Both `backend/main.py` and any standalone scripts import from them
directly (e.g. `from agent.graph import run_agent`,
`from database.db import Slot`). Never nest them inside `backend/`.
 
## API contract
- `POST /chat` → `{user_id, message}` → `{reply}`
- `GET /slots` → `[{slot_id, zone, status, reserved_until}]`
- `POST /reservations` → `{slot_id, user_id, duration_minutes}` → `{reservation_id, slot_id, end_time}`
## Agent tools
`check_availability(zone)`, `make_reservation(slot_id, user_id, duration_minutes)`,
`cancel_reservation(reservation_id)`. Must handle multi-turn/ambiguous
requests, not just single-turn Q&A. Agent's only public entry point:
`run_agent(user_id, message) -> str`.
 
## Conventions
- CORS enabled for Vite dev port in FastAPI.
- Simple, readable code over optimization — must be explainable to evaluators.
- Check this file before adding new deps/infra.
## Working style (token efficiency)
- Be concise. No long explanations unless asked — just code + a 1-line summary.
- Don't re-explain the stack/schema back to me; assume it's known from this file.
- Prefer editing existing files over regenerating whole files.
- Ask before adding new libraries not listed above