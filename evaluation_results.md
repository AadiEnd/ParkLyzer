# ParkLyzer — Evaluation Results

Run date: 2026-08-12
Backend command: `uvicorn backend.main:app --reload --reload-dir backend --reload-dir agent --reload-dir database --port 8000`
Setup confirmed before testing: MySQL80 service running; `slots` table had 18 rows across 3 zones (Entrance, Gate 1, Gate 2), consistent with the seed schema (some rows already carried reservations from prior manual testing, not a fresh seed — noted where it affects test setup below).

All tests below hit the **live running backend** over real HTTP (`requests` library) or read the live MySQL database directly. No numbers are estimated.

## Critical constraint encountered: Gemini free-tier daily quota

Mid-run, the LLM backing the agent (`gemini-flash-latest` via `langchain-google-genai`) began returning:

```
429 RESOURCE_EXHAUSTED: Quota exceeded for metric:
generativelanguage.googleapis.com/generate_content_free_tier_requests,
limit: 20, model: gemini-3.6-flash
GenerateRequestsPerDayPerProjectPerModel-FreeTier, quotaValue: 20
```

This is a **hard daily cap of 20 requests/day** on the free tier for this model/project, not a burst limit — confirmed by retrying after the API's suggested 50s backoff and still getting the same 429. This exhausted after 11 of the Section A `/chat` calls (Section A scenarios 1–7 use 11 requests total: 1+1+1+1+2+2+2+1 counting all turns through scenario 7, then scenario 8 was the 12th and first to fail — the daily counter had already been partly consumed by earlier manual/dev testing done earlier the same day, before this evaluation run started).

**Consequence:** Section B (10-message latency benchmark) could not be run to completion — every `/chat` call after the quota hit returns HTTP 500 with an empty body, because `backend/routes/chat.py` calls `run_agent()` with no exception handling, so the `ChatGoogleGenerativeAIError` propagates as an unhandled 500 rather than a clean error response. This is reported as a real finding, not skipped.

CLAUDE.md documents "Ollama fallback" as part of the intended stack, but `agent/graph.py` only constructs a single `ChatGoogleGenerativeAI` model with no fallback path — so in practice there is no fallback when the Gemini quota is hit. This is a documentation/implementation gap, not something fixed here per the read-only scope of this task.

---

## Section A — Functional Correctness

| # | Scenario | Result | Actual agent output |
|---|----------|--------|----------------------|
| 1 | Simple availability query — "is anything free at Gate 1?" | **PASS** | "Yes, slots **G1-2**, **G1-5**, and **G1-6** are currently free at Gate 1. Would you like to reserve one of them? If so, please let me know which slot and for how long." (matched actual free slots in DB at the time: G1-2, G1-5, G1-6) |
| 2 | Availability query with no matches — reserved all 4 free Gate 2 slots (G2-2, G2-3, G2-5, G2-6) via direct `POST /reservations`, then asked "is anything free at Gate 2?" | **PASS** | "There are currently no free parking slots at Gate 2. Would you like me to check availability in Gate 1 or the Entrance instead?" |
| 3 | Direct reservation by slot ID — "reserve E-2 for 30 minutes" | **PASS** | "Reserved E-2 for 30 minutes! Your reservation ID is `05fd49df-b929-4ffb-9b10-2801de293944`." (confirmed E-2 flipped to `reserved` in DB) |
| 4 | Ambiguous reservation — "reserve a spot for me" (no zone/duration) | **PASS** | "Which zone would you prefer (Gate 1, Gate 2, or Entrance), and how long do you need the spot reserved for?" — correctly asked a clarifying question instead of guessing a slot |
| 5 | Multi-turn refinement — turn 1: "is there parking free near Gate 1?", turn 2: "actually, something closer to the entrance" | **PASS** | Turn 1: listed G1-2, G1-5, G1-6. Turn 2: "In the **Entrance** zone, the following slots are currently free: **E-3**, **E-4**, **E-5**, and **E-6**." — correctly reinterpreted "closer to the entrance" as a zone switch using prior turn's context, without being told to abandon Gate 1 explicitly |
| 6 | Cancellation referencing earlier reservation_id — turn 1: "reserve E-3 for 20 minutes", turn 2: "actually, cancel that reservation" | **PASS** | Turn 1: "I've reserved slot **E-3** for 20 minutes (Reservation ID: `616c885f-8893-49e3-8f58-b3364d54098a`)." Turn 2: "Your reservation for slot **E-3** has been cancelled." — cancelled the correct reservation_id from conversation memory without the user repeating it, and E-3 was confirmed `free` again in the DB immediately after |
| 7 | Conflict — turn 1: "is G1-2 free? I might want it" → agent confirms free; **then a direct `POST /reservations` call from a different user_id reserves G1-2 while the agent conversation is still open**; turn 2: "ok, reserve G1-2 for 15 minutes" | **PASS** | Turn 1: "Yes, G1-2 is currently free! Would you like me to reserve it..." Direct API call succeeded (200, reservation_id `3b6b3a2...`) for a rival user. Turn 2: "It looks like G1-2 was just taken! However, slots G1-5 and G1-6 in Gate 1 are still available. Would you like to reserve one of those instead?" — agent correctly detected the `make_reservation` error, called `check_availability` again per its system prompt, and offered real alternatives instead of failing silently or reporting a false success |
| 8 | Invalid/nonexistent zone — "is anything free at Zone Z9?" | **FAIL** | `POST /chat` → HTTP 500, body `Internal Server Error`. Root cause: Gemini daily quota (20 req/day) was exhausted by this point in the run (see above) — `ChatGoogleGenerativeAIError` from the 429 propagates unhandled through `run_agent()` → `backend/routes/chat.py` with no try/except, producing a bare 500 instead of a graceful reply. **Not evaluated for actual invalid-zone handling behavior** — the quota exhaustion pre-empted the test. Separately, this exposes a real gap: no error handling in `chat.py` around `run_agent()`, so any LLM-side failure (quota, timeout, malformed response) surfaces to the client as an opaque 500 rather than a usable error. |

**7/8 PASS, 1/8 FAIL** (failure caused by external quota exhaustion + missing error handling, not incorrect agent reasoning).

---

## Section B — Response Latency

**Not completed.** The Gemini free-tier daily quota (20 requests/day/model) was exhausted during Section A (by scenario 8, the 12th `/chat` call of the run), so the planned 10-message latency benchmark could not be executed — every subsequent `/chat` call returns HTTP 500 (quota error), not a real agent response, and timing those would not measure genuine agent latency.

Per the task instructions, no latency numbers are estimated or fabricated here. What can be honestly reported:

- All 11 successful `/chat` calls in Section A (7 single-turn + 2 two-turn conversations = 11 requests) completed with real, coherent replies — subjectively on the order of a few seconds each based on wall-clock observation during the run, but exact per-call timings were not persisted before the run's script exited on the Section A8 exception, so no numeric min/max/avg/median can be reported without guessing.
- **Recommendation for a follow-up run**: re-run the latency benchmark on a day with fresh quota (resets ~daily), or point `GOOGLE_API_KEY` at a paid-tier key / configure the documented Ollama fallback, so 10+ consecutive calls don't hit the cap.

---

## Section C — API Endpoint Verification

### `POST /chat`
Request: `{"user_id": "eval_a1", "message": "is anything free at Gate 1?"}`
Response: `200 OK`
```json
{"reply": "Yes, slots **G1-2**, **G1-5**, and **G1-6** are currently free at Gate 1. \n\nWould you like to reserve one of them? If so, please let me know which slot and for how long."}
```
Matches contract (`{reply}`) exactly.

### `GET /slots`
Response: `200 OK`, 18 items (matches "18 slots" from CLAUDE.md).
```json
[
  {"slot_id": "E-1", "zone": "Entrance", "status": "reserved", "reserved_until": "2026-08-05T20:43:20"},
  {"slot_id": "E-2", "zone": "Entrance", "status": "reserved", "reserved_until": "2026-08-12T16:44:01"},
  {"slot_id": "E-3", "zone": "Entrance", "status": "free", "reserved_until": null}
]
```
Matches contract (`[{slot_id, zone, status, reserved_until}]`) exactly, all IDs are strings as required.

### `POST /reservations`
Request: `{"slot_id": "E-3", "user_id": "eval_c_direct", "duration_minutes": 15}`
Response: `200 OK`
```json
{"reservation_id": "f6fb57f8-b75d-4d3b-8f61-184903434b3e", "slot_id": "E-3", "end_time": "2026-08-12T16:37:29.975699"}
```
Matches contract (`{reservation_id, slot_id, end_time}`) exactly, `reservation_id` is a string (UUID) as required.

---

## Section D — Concurrent Reservation Handling

Two reservation requests for the **same slot** (`E-4`), fired concurrently from two threads via `ThreadPoolExecutor(max_workers=2)` against the live `POST /reservations` endpoint:

- Request 1 (`eval_d_user1`): `200 OK` → `{"reservation_id": "9fcd0001-d93b-4d76-b9d2-0577b4bab4a3", "slot_id": "E-4", "end_time": "2026-08-12T16:32:34.047122"}`
- Request 2 (`eval_d_user2`): `400 Bad Request` → `{"detail": "Slot 'E-4' is not available (status: reserved)."}`

Post-check against the live DB: exactly **one** `active` reservation exists for slot E-4 (the winning request), and `slots.status` for E-4 is `reserved` — no double-booking or orphaned rows observed in this run.

**Honest caveat:** `make_reservation()` in `agent/tools.py` has no row-level locking (no `SELECT ... FOR UPDATE`, no unique constraint enforcing "one active reservation per slot" at the DB level) — it reads `slot.status`, checks it in Python, then writes an unconditional `UPDATE` by primary key. Under true simultaneous writes (both transactions reading the "free" snapshot before either commits), this pattern is a classic TOCTOU race that could produce two `active` reservation rows for one slot with the last writer clobbering `reserved_by`/`reserved_until`. This run's two threads did not land close enough in time to trigger it — Python's GIL plus per-request connection/session setup overhead was enough serialization in practice — so **no data inconsistency was reproduced in this specific run**, but the code path is not inherently safe against it. Flagging this as a real risk for the paper's discussion, not as a confirmed reproduced bug.

---

## Summary of findings for write-up

1. **Agent reasoning quality (Section A): 7/8 scenarios passed**, including the harder multi-turn and conflict-detection cases (#5, #6, #7) — the LangGraph react-agent correctly used conversation memory and correctly recovered from a real reservation conflict by re-checking availability and offering alternatives, matching the system prompt's rules.
2. **Scenario #8 failure is an infrastructure limit, not a reasoning failure**: Gemini free tier's 20 requests/day cap was exhausted mid-run, and the failure mode is an unhandled 500 rather than a graceful degradation — worth fixing (`try/except` around `run_agent()` in `backend/routes/chat.py`) if the team wants to demo error resilience, though it's out of scope for this test-only task.
3. **Section B (latency) is incomplete** due to the same quota limit — needs a re-run with fresh quota or a non-free-tier key.
4. **API contracts (Section C) match CLAUDE.md exactly** for all three endpoints, verified against real responses.
5. **No concurrency bug reproduced in Section D**, but the underlying code has no locking/constraint to prevent one, which is a latent risk worth naming explicitly in the paper rather than claiming the system is race-safe.
