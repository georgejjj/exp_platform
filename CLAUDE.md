# 财智方舟 — Behavioral Finance Experiment Platform

## Project Overview

Web-based 2x2 experimental platform for studying the Gambler's Fallacy in investment decisions. Participants: demographic survey → behavioral test → race-car mini-game (second fallacy measurement) → personalized feedback → simulated trading (Round 1) → personalized education → simulated trading (Round 2, with/without guidance) → results comparison.

## Architecture

- **Backend**: Python 3.11+ / FastAPI / SQLAlchemy async — in `backend/`
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts — in `frontend/` — "Academic Ink" design system
- **Database**: SQLite (local dev, `backend/exp_platform.db`) or PostgreSQL (production via Docker)
- **Deployment**: Docker Compose with Nginx reverse proxy

## Quick Start (Local Dev)

```bash
# Backend
cd backend
pip install fastapi uvicorn sqlalchemy aiosqlite alembic pydantic pydantic-settings python-jose passlib python-multipart openpyxl numpy httpx bcrypt
python3 -m app.seed          # Creates DB + admin (admin/admin123) + demo experiment (DEMO2026)
python3 -m uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev                  # http://localhost:5173 — proxies /api to :8000
```

## Key Commands

| Task | Command |
|------|---------|
| Run backend | `cd backend && python3 -m uvicorn app.main:app --reload` |
| Run frontend | `cd frontend && npm run dev` |
| Seed database | `cd backend && python3 -m app.seed` |
| TypeScript check | `cd frontend && npx tsc --noEmit` |
| Build frontend | `cd frontend && npm run build` |
| Docker (production) | `docker compose up --build` |

## Project Structure

```
backend/app/
├── main.py          # FastAPI app, CORS, router includes
├── config.py        # Settings from .env (DATABASE_URL, SECRET_KEY)
├── database.py      # Engine, session, JSONType/UUIDType (SQLite-compatible)
├── seed.py          # Database seeding script
├── models/          # SQLAlchemy ORM (14 models, incl. RaceCarGameSession/RaceCarRound)
├── schemas/         # Pydantic request/response (9 modules)
├── api/             # Route handlers (9 routers + deps.py)
├── services/        # Business logic (6 modules)
└── utils/security.py

frontend/src/
├── App.tsx          # React Router (all routes)
├── api/             # Axios client + all API functions
├── context/         # AuthContext, ExperimentContext (incl. gameResult)
├── hooks/           # useEventLogger (batched event logging)
├── pages/           # participant/ (10 pages, incl. RaceCarGamePage) + admin/ (2 pages)
├── components/      # trading/, charts/, shared/
├── types/           # TypeScript interfaces
└── utils/           # Formatters, label maps
```

## Design System: "Academic Ink"

Inspired by academic journals, financial terminals, and Chinese calligraphy.

- **Colors**: Deep ink tones (`ink-900` to `ink-50`) as primary palette, warm amber (`amber-500`/`amber-600`) for accents/CTAs, `paper` (#fefdfb) for card backgrounds
- **Fonts**: `font-serif` → Noto Serif SC (display headings), `font-sans` → IBM Plex Sans (body/UI), `font-mono` → IBM Plex Mono (numbers/data)
- **Trading colors**: Chinese convention — red (`text-up`) for gains, green (`text-down`) for losses
- **Components**: `.card` (paper bg + hairline border), `.btn-primary` (amber), `.btn-secondary` (outlined), `.animate-fade-up` entrance animation
- **Pattern**: Subtle paper-texture background via CSS radial-gradient noise
- **CSS variables**: Defined in `src/index.css` (e.g., `--ink-900`, `--amber-500`, `--paper`)
- **Tailwind tokens**: Extended in `tailwind.config.js` — `colors.ink.*`, `colors.paper`, `colors.amber.*`, `colors.up`, `colors.down`

## Coding Conventions

- **Backend**: Python type hints, async/await for all DB operations, Pydantic v2 schemas
- **Backend queries**: Always use `.order_by(...).limit(1)` when querying trading sessions to prevent `MultipleResultsFound` errors from duplicate sessions
- **Frontend**: TypeScript strict mode, functional components with hooks, Tailwind utility classes
- **Language**: UI text is in Chinese (zh-CN). Code comments/docs in English.
- **IDs**: Stored as UUID strings (String(36)) for SQLite compatibility. No `uuid.UUID()` casts in queries — compare directly as strings.
- **JSON fields**: Use `JSONType` (custom TypeDecorator in `database.py`) instead of PostgreSQL-specific `JSONB`
- **Primary keys**: Use `UUIDType` (custom TypeDecorator) instead of PostgreSQL `UUID`

## Database

- **Local dev**: SQLite at `backend/exp_platform.db` (auto-created by seed script)
- **Production**: PostgreSQL via `DATABASE_URL` env var
- **Models use dialect-agnostic types** (`JSONType`, `UUIDType` from `database.py`) that work with both SQLite and PostgreSQL
- To reset: delete `backend/exp_platform.db` and re-run `python3 -m app.seed`

## Authentication

- **Participants**: JWT token from `POST /api/auth/join` with experiment code. Token in `Authorization: Bearer <token>` header.
- **Admin**: JWT from `POST /api/auth/admin/login`. Separate `admin_token` in localStorage.
- Default admin: `admin` / `admin123`
- Demo experiment code: `DEMO2026`

## 4 Experiment Groups

| Group | Education | Phase 2 Guidance |
|-------|-----------|-----------------|
| `control` | Generic | No |
| `feedback` | Personalized (by bias level) | No |
| `guidance` | Generic | Yes (probability prediction popup) |
| `feedback_guidance` | Personalized | Yes |

## Participant Flow (Steps)

`joined` → `demographics` → `pre_test` → `race_car_game` → `personality_feedback` → `phase1_trading` → `post_test` → `analysis` → `education` → `phase2_trading` → `final_results` → `completed`

## Race-Car Mini-Game

A second gambler's-fallacy measurement inserted between the cognitive questionnaire and the personality feedback. Spec is taken from slide 7 of `财智方舟v3.pptx`.

- **Mechanics**: 10 forked-road intersections, obstacle on left/right is i.i.d. 50/50. Player presses ← or → (or button) to predict which side the obstacle will appear on; the car auto-takes the opposite branch. Rewards: +30 coins correct, +10 if wrong-but-jumps (30% chance), else 0.
- **Sequence generation**: SHA-256 of `participant_id` seeds a `random.Random`; generates a 10-flip sequence and rejects until at least one streak of length ≥ 3 exists (ensures the metric has signal). See `_generate_obstacle_sequence` in `backend/app/api/race_car.py`.
- **Scoring** (`calculate_game_fallacy_score` in `fallacy_scorer.py`): for each round where the preceding obstacle streak ≥ 2, mark the prediction as anti-streak iff it differs from the streak direction. Score = anti-streak / streak-opportunity rounds × 100.
- **Combined bias-level**: on `POST /api/racecar/complete` the backend computes the participant's actual cognitive fallacy from their `QuestionnaireResponse` rows, then sets `participant.bias_level = determine_bias_level(0.4 × cognitive + 0.6 × behavioral)`. The weights are `COGNITIVE_WEIGHT` / `BEHAVIORAL_WEIGHT` constants in `race_car.py` and are echoed back to the client so the UI can show the same arithmetic.

## Important Files

- `backend/app/services/trading_engine.py` — Trade validation, execution, streak calculation
- `backend/app/services/fallacy_scorer.py` — Cognitive (questionnaire), behavioral (trading pattern), and game (race-car) scoring
- `backend/app/services/price_generator.py` — Binary (±10%) and normal (log-normal) price generation
- `backend/app/services/analysis_engine.py` — Investor profile classification, comprehensive analysis
- `backend/app/api/trading.py` — Core trading loop (period progression, settlement)
- `backend/app/api/race_car.py` — Race-car game endpoints (`start`, `state`, `predict`, `complete`)
- `backend/app/models/race_car_game.py` — `RaceCarGameSession`, `RaceCarRound`
- `frontend/src/pages/participant/TradingPage.tsx` — Trading simulation UI
- `frontend/src/pages/participant/RaceCarGamePage.tsx` — Race-car game UI (SVG road, scrolling motion, keyboard input)
- `frontend/src/components/trading/GuidancePopup.tsx` — Phase 2 probability prediction modal

## Known Issues (Resolved)

- **Duplicate trading sessions**: React dev mode double-fires `useEffect`, which could call `POST /trading/start` twice and create duplicate active sessions. Fixed by querying with `status == "active"` + `.limit(1)` in `start_trading`, and `.order_by(created_at.desc()).limit(1)` in all session lookups (`trading.py`, `analysis.py`).
- **Async lazy-loading on race-car relationships**: SQLAlchemy async sessions raise `MissingGreenlet` if a relationship (e.g. `session.rounds`) is accessed inside an `async def` endpoint. In `race_car.py`, never traverse the `RaceCarGameSession.rounds` collection from the session object — issue a separate `select(RaceCarRound).where(game_session_id=...)` instead.

## Remaining Work

See `PLAN.md` for full implementation plan. Key remaining items:
- Multi-stock mode (6 stocks)
- Session resume on browser refresh
- Mobile responsive design
- Unit/E2E tests
- Alembic migration generation
