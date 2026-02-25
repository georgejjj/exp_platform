# 财智方舟 — Behavioral Finance Experiment Platform

## Project Overview

Web-based 2x2 experimental platform for studying the Gambler's Fallacy in investment decisions. Participants: demographic survey → behavioral test → simulated trading (Round 1) → personalized education → simulated trading (Round 2, with/without guidance) → results comparison.

## Architecture

- **Backend**: Python 3.11+ / FastAPI / SQLAlchemy async — in `backend/`
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts — in `frontend/`
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
├── models/          # SQLAlchemy ORM (12 models)
├── schemas/         # Pydantic request/response (8 modules)
├── api/             # Route handlers (8 routers + deps.py)
├── services/        # Business logic (6 modules)
└── utils/security.py

frontend/src/
├── App.tsx          # React Router (all routes)
├── api/             # Axios client + all API functions
├── context/         # AuthContext, ExperimentContext
├── hooks/           # useEventLogger (batched event logging)
├── pages/           # participant/ (9 pages) + admin/ (2 pages)
├── components/      # trading/, charts/, shared/
├── types/           # TypeScript interfaces
└── utils/           # Formatters, label maps
```

## Coding Conventions

- **Backend**: Python type hints, async/await for all DB operations, Pydantic v2 schemas
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

`joined` → `demographics` → `pre_test` → `personality_feedback` → `phase1_trading` → `post_test` → `analysis` → `education` → `phase2_trading` → `final_results` → `completed`

## Important Files

- `backend/app/services/trading_engine.py` — Trade validation, execution, streak calculation
- `backend/app/services/fallacy_scorer.py` — Behavioral (trading pattern) and cognitive (questionnaire) scoring
- `backend/app/services/price_generator.py` — Binary (±10%) and normal (log-normal) price generation
- `backend/app/services/analysis_engine.py` — Investor profile classification, comprehensive analysis
- `backend/app/api/trading.py` — Core trading loop (period progression, settlement)
- `frontend/src/pages/participant/TradingPage.tsx` — Trading simulation UI
- `frontend/src/components/trading/GuidancePopup.tsx` — Phase 2 probability prediction modal

## Remaining Work

See `PLAN.md` for full implementation plan. Key remaining items:
- Multi-stock mode (6 stocks)
- Session resume on browser refresh
- Mobile responsive design
- Unit/E2E tests
- Alembic migration generation
