# Parking Lot AI Assistant — Project Rules

College major project, team of 4-5. Prototype/demo quality, not production.

## Build status (update as project progresses)
- `database/` — DONE, WORKING. Do not recreate/modify.
- `agent/` — DONE, WORKING. Do not recreate/modify.
- `backend/` — DONE, WORKING. Includes Google OAuth (`backend/routes/auth.py`).
- `frontend/` — DONE, WORKING. Redesigned dark/glassmorphism UI with Google sign-in (see Styling and Frontend conventions below).

## Stack (fixed — never substitute)
- Backend: Python + FastAPI
- DB: MySQL (SQLAlchemy + PyMySQL). Never SQLite/Mongo/Postgres.
- Agent: LangChain + LangGraph
- LLM: Gemini free tier (`langchain-google-genai`) primary, Ollama fallback.
  NEVER use Anthropic/Claude API for the app itself (no budget).
- Frontend: React (Vite), plain REST fetch/polling. No Next.js, no WebSockets.
- Styling: Tailwind CSS (utility classes, no separate CSS files) + `clsx` +
  `tailwind-merge` (via a local `cn()` helper) for conditional classes.
- Animation: `framer-motion` for transitions/entrances. Icons: `lucide-react`.
  Don't add other animation/icon/UI-kit libraries — these two cover it.
- Auth: Google OAuth via `backend/routes/auth.py` (manual `urllib`-based
  flow, no `authlib`/`django-allauth` etc.) + `starlette` `SessionMiddleware`
  cookie session. Frontend calls `/auth/google/login`, `/auth/me`,
  `/auth/logout` from `src/api/client.js`. Guest mode (`user_id = 'guest'`)
  still works without signing in.
- Env vars via `.env` (python-dotenv) — never hardcode secrets/keys.
  Auth needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`,
  `FRONTEND_URL`, `GOOGLE_CALLBACK_URL` (see `.env.example`).
- Frontend: React (Vite), plain REST fetch/polling. No Next.js, no WebSockets.
- Styling: Tailwind CSS. Animation: framer-motion. Icons: lucide-react. 
  Utility: clsx for conditional classNames.

## Out of scope — do not build or suggest
CV/camera detection, IoT sensors, WebSockets, payment gateway, cloud
deployment, load balancing — unless I explicitly ask. (Auth/login is now
in scope — Google OAuth only, see Stack above. Don't add other providers
or a password-based login without asking.)

## Schema
```sql
slots(slot_id PK VARCHAR(10), zone, status ENUM('free','occupied','reserved'), reserved_by, reserved_until)
reservations(reservation_id PK VARCHAR(36), slot_id FK, user_id, start_time, end_time, status ENUM('active','completed','cancelled'))
```
All IDs (`slot_id`, `reservation_id`) are STRINGS, never integers.
Static seed data, 18 slots, 3 zones (Gate 1, Gate 2, Entrance — 6 each). No sensors.

## Structure
```
project/
├── database/       db.py, seed.py                             (shared, root-level)
├── agent/          tools.py, graph.py, test_cli.py             (shared, root-level)
├── backend/        main.py, models/schemas.py, routes/{auth.py,chat.py,parking.py}
└── frontend/parking-frontend/
    ├── dev-server.mjs                      (runs backend uvicorn + vite together)
    └── src/components/{ChatWindow,SlotGrid}.jsx, src/api/client.js, App.jsx
```
`database/` and `agent/` live at project root — NOT inside `backend/`.
Both `backend/main.py` and any standalone scripts import from them
directly (e.g. `from agent.graph import run_agent`,
`from database.db import Slot`). Never nest them inside `backend/`.
`frontend/parking-frontend/` stays flat — components in `src/components/`,
no route-based folder structure (no router in use).

## API contract
- `POST /chat` → `{user_id, message}` → `{reply}`
- `GET /slots` → `[{slot_id, zone, status, reserved_until}]`
- `POST /reservations` → `{slot_id, user_id, duration_minutes}` → `{reservation_id, slot_id, end_time}`

## Agent tools
`check_availability(zone)`, `make_reservation(slot_id, user_id, duration_minutes)`,
`cancel_reservation(reservation_id)`. Must handle multi-turn/ambiguous
requests, not just single-turn Q&A. Agent's only public entry point:
`run_agent(user_id, message) -> str`.

**Single source of truth rule:** any backend route that reserves or
cancels a slot MUST call `make_reservation()` / `cancel_reservation()`
from `agent/tools.py` directly. NEVER reimplement this logic inside
`backend/routes/`. This keeps the chat flow and direct API flow
behaviorally identical.

## Frontend conventions
- Dark theme only (glassmorphism cards: `rounded-3xl border border-white/10
  bg-white/5 backdrop-blur-xl`). No light-mode variant.
- Class merging: build a small local `cn(...)` = `twMerge(clsx(...))` helper
  per file rather than importing a shared one — that's the existing pattern
  in `App.jsx`/`ChatWindow.jsx`/`SlotGrid.jsx`.
- Wrap entrance/exit animations in `framer-motion`, always reading
  `useReducedMotion()` and branching the animation props on it.
- State/data flows up from `SlotGrid` to `App` via `onSlotsDataChange`
  (summary + activity), then down into `ChatWindow` via props — no context
  or state library. Keep following this prop-drilling pattern for 3-component
  app; don't introduce Redux/Zustand/Context for it.

## Commands
- `npm run dev` (from `frontend/parking-frontend/`) — starts backend
  (`uvicorn backend.main:app` on port 8000) and Vite frontend together via
  `dev-server.mjs`. Preferred way to run the app locally.
- `npm run dev:frontend` — Vite only. `npm run dev:backend` — uvicorn only.
- `npm run build` / `npm run preview` — production build / preview.
- `npm run lint` — oxlint.

## Conventions
- CORS enabled in FastAPI for `http://localhost:5173` (Vite's default dev port).
- Simple, readable code over optimization — must be explainable to evaluators.
- Check this file before adding new deps/infra.

## Working style (token efficiency)
- Be concise. No long explanations unless asked — just code + a 1-line summary.
- Don't re-explain the stack/schema back to me; assume it's known from this file.
- Prefer editing existing files over regenerating whole files.
- Ask before adding new libraries not listed above.