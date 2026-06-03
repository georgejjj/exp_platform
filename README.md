# 财智方舟 — Behavioral Finance Experiment Platform

A web-based experiment platform for studying the **Gambler's Fallacy** in investment decisions. Participants complete demographics, two independent fallacy measurements (a cognitive questionnaire and an avoidance mini-game), then two rounds of simulated trading separated by personalized education and (for some groups) probability guidance. The platform automatically classifies the participant's bias level, delivers tailored interventions, and produces a comparison report.

> Implementation of the experimental design from `财智方舟v3.pptx`.

## Demo

```bash
# 1. Backend
cd backend
pip install fastapi uvicorn sqlalchemy aiosqlite pydantic pydantic-settings \
            python-jose passlib python-multipart openpyxl numpy httpx bcrypt
python3 -m app.seed              # creates DB + admin + DEMO2026 experiment
python3 -m uvicorn app.main:app --reload --port 8000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

Open <http://localhost:5173/>, enter experiment code `DEMO2026`, and complete the flow. The admin dashboard is at `/admin/login` with `admin` / `admin123`.

## Participant Flow

1. **Join** — enter experiment code (`DEMO2026`), get assigned to one of four groups.
2. **Demographics** — 5-question profile.
3. **Pre-test questionnaire** — 5 multiple-choice items about probability and independent events.
4. **Race-car mini-game** — 10 forked-road intersections; predict which side an obstacle will appear on (50/50 i.i.d.). The car auto-takes the other lane. This is a second, behavioral measurement of the same fallacy.
5. **Personality feedback** — combined gambler's-fallacy index (40% questionnaire + 60% game), with a per-component breakdown.
6. **Phase-1 trading** — 20 periods of single-stock simulated trading.
7. **Education** — content tailored to the participant's bias level (some groups) or generic (control).
8. **Phase-2 trading** — same trading task; groups with "guidance" see a probability-prediction popup before each decision.
9. **Final results** — round-by-round comparison and a comprehensive analysis.

## Experiment Groups

A 2×2 factorial of intervention type:

| Group | Education | Phase-2 Guidance Popup |
|-------|-----------|------------------------|
| `control` | Generic | No |
| `feedback` | Personalized (by bias level) | No |
| `guidance` | Generic | Yes |
| `feedback_guidance` | Personalized | Yes |

Assignment is balanced-random across active participants in an experiment.

## Architecture

| Layer | Stack |
|-------|-------|
| Backend | Python 3.11+ · FastAPI · SQLAlchemy 2 (async) · Pydantic v2 |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · Recharts |
| Database | SQLite (local dev) or PostgreSQL (production) via dialect-agnostic `JSONType` / `UUIDType` |
| Auth | JWT (`Authorization: Bearer <token>`) — separate participant and admin tokens |
| Deployment | Docker Compose with Nginx reverse proxy |

The frontend uses an **"Academic Ink"** design system (ink-tone palette, amber accents, serif headlines) for the experiment chrome; the race-car mini-game is a stylized SVG scene with parallax-scrolling road, trees, and waypoint signage embedded inside the same container.

## Repository Layout

```
backend/app/
  main.py            FastAPI app, CORS, router includes
  database.py        Engine, session, dialect-agnostic TypeDecorators
  seed.py            Seeds admin, DEMO2026 experiment, questionnaires, education
  models/            SQLAlchemy ORM (14 tables)
  schemas/           Pydantic request/response models (9 modules)
  api/               9 routers: auth, demographics, questionnaire, race_car,
                     trading, analysis, education, events, admin
  services/          fallacy_scorer, trading_engine, price_generator,
                     analysis_engine, group_assignment, data_exporter

frontend/src/
  App.tsx            React Router routes
  api/               Axios client + typed endpoint functions
  context/           AuthContext, ExperimentContext (carries gameResult etc.)
  hooks/             useEventLogger (batched event logging to backend)
  pages/participant  10 pages (join, demographics, questionnaire, race-car,
                     personality feedback, trading, settlement, analysis,
                     education, final results)
  pages/admin        Admin dashboard
  components/        trading/, charts/, shared/, questionnaire/, analysis/
  types/             TypeScript interfaces mirroring backend schemas
```

## How the Two Fallacy Measurements Combine

| Source | Score | Weight |
|--------|-------|--------|
| Cognitive — questionnaire | `100 − correctness%` on the pre-test | 40% |
| Behavioral — mini-game | anti-streak prediction ratio × 100 (rounds where prior streak ≥ 2) | 60% |

The weighted sum drives `participant.bias_level` (`mild` / `moderate` / `severe`), which the education service uses to choose content for groups receiving personalized feedback. Both raw scores and the combined index are shown to the participant on the personality-feedback page.

## Key Commands

| Task | Command |
|------|---------|
| Run backend | `cd backend && python3 -m uvicorn app.main:app --reload` |
| Run frontend | `cd frontend && npm run dev` |
| Seed / reset database | `cd backend && rm exp_platform.db && python3 -m app.seed` |
| TypeScript check | `cd frontend && npx tsc --noEmit` |
| Build frontend | `cd frontend && npm run build` |
| Docker (production) | `docker compose up --build` |

## Development Notes

- UI text is in **Chinese (zh-CN)**; code, comments, and identifiers are in English.
- The race-car game uses keyboard input too: `←` / `→` arrows during the idle phase trigger the same prediction as the on-screen buttons.
- The obstacle sequence per participant is deterministic (SHA-256 seed of the participant ID), so a researcher can reproduce a session exactly.
- For development details, conventions, gotchas, and where to add new behavior, see [`CLAUDE.md`](./CLAUDE.md).
- For the remaining roadmap, see [`PLAN.md`](./PLAN.md).
