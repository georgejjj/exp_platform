# Implementation Plan: 财智方舟 Behavioral Finance Experiment Platform

## Context

This platform is a web-based research tool for studying and debiasing investor behavioral biases, specifically the **Gambler's Fallacy**. Participants go through a structured experiment: demographic survey → behavioral test → simulated trading (Round 1) → personalized education → simulated trading (Round 2, with/without guidance) → results comparison. The platform supports a 2x2 experimental design (feedback x guidance) with 4 groups, configurable parameters, and comprehensive data logging for research analysis.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ / FastAPI / Uvicorn |
| Frontend | React 18 + TypeScript + Vite |
| Database | PostgreSQL 15+ (production) / SQLite (local dev) |
| ORM | SQLAlchemy async + Alembic |
| Styling | Tailwind CSS ("Academic Ink" design system) |
| Charts | Recharts |
| Deployment | Docker Compose (Nginx + FastAPI + PostgreSQL) |

---

## Project Structure

```
exp_platform/
├── docker-compose.yml
├── .env.example
├── CLAUDE.md
├── PLAN.md
├── backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── .env
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── config.py                  # Environment settings (DATABASE_URL, SECRET_KEY)
│   │   ├── database.py                # SQLAlchemy async engine + JSONType/UUIDType
│   │   ├── seed.py                    # DB seeding (admin, demo experiment, questionnaires)
│   │   ├── models/
│   │   │   ├── experiment.py          # Experiment, PriceSequence
│   │   │   ├── participant.py         # Participant
│   │   │   ├── questionnaire.py       # Questionnaire, QuestionnaireResponse
│   │   │   ├── trading.py             # TradingSession, TradeAction, PortfolioSnapshot
│   │   │   ├── guidance.py            # GuidanceResponse
│   │   │   ├── education.py           # EducationContent
│   │   │   ├── event_log.py           # EventLog
│   │   │   └── researcher.py          # Researcher (admin)
│   │   ├── schemas/                   # Pydantic request/response models
│   │   │   ├── auth.py, demographics.py, questionnaire.py
│   │   │   ├── trading.py, analysis.py, education.py
│   │   │   ├── events.py, admin.py
│   │   ├── api/                       # Route handlers
│   │   │   ├── deps.py                # Dependency injection (JWT auth)
│   │   │   ├── auth.py                # Join experiment, admin login
│   │   │   ├── demographics.py        # Submit demographics
│   │   │   ├── questionnaire.py       # Get/answer/complete questionnaires
│   │   │   ├── trading.py             # Start/state/action/guidance/complete trading
│   │   │   ├── analysis.py            # Comprehensive analysis, final results
│   │   │   ├── education.py           # Personalized education content
│   │   │   ├── events.py              # Batch event logging
│   │   │   └── admin.py               # Experiment CRUD, stats, export
│   │   ├── services/
│   │   │   ├── price_generator.py     # Binary & normal price generation
│   │   │   ├── trading_engine.py      # Trade validation, execution, streak calc
│   │   │   ├── fallacy_scorer.py      # Behavioral & cognitive scoring
│   │   │   ├── analysis_engine.py     # Investor profiles, comprehensive analysis
│   │   │   ├── group_assignment.py    # Balanced random / sequential assignment
│   │   │   └── data_exporter.py       # CSV export
│   │   └── utils/security.py          # JWT, bcrypt password hashing
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx                   # React entry point
│       ├── App.tsx                    # Router setup
│       ├── index.css                  # Tailwind imports
│       ├── api/
│       │   ├── client.ts             # Axios instance with JWT interceptors
│       │   └── index.ts              # All API call functions
│       ├── context/
│       │   ├── AuthContext.tsx        # Participant auth state + localStorage
│       │   └── ExperimentContext.tsx  # Test results, settlement data
│       ├── hooks/
│       │   └── useEventLogger.ts     # Batched event logging
│       ├── pages/participant/
│       │   ├── JoinPage.tsx           # Experiment code entry
│       │   ├── DemographicsPage.tsx   # 5-step demographics survey
│       │   ├── QuestionnairePage.tsx  # Generic questionnaire renderer
│       │   ├── PersonalityFeedbackPage.tsx  # Bias level feedback
│       │   ├── TradingPage.tsx        # Trading simulation (rounds 1 & 2)
│       │   ├── SettlementPage.tsx     # Round results
│       │   ├── AnalysisPage.tsx       # Comprehensive analysis
│       │   ├── EducationPage.tsx      # Debiasing education
│       │   └── FinalResultsPage.tsx   # Round 1 vs 2 comparison
│       ├── pages/admin/
│       │   ├── AdminLoginPage.tsx     # Admin login
│       │   └── DashboardPage.tsx      # Experiment management
│       ├── components/
│       │   ├── trading/
│       │   │   ├── SingleStockView.tsx  # Chart + controls + portfolio
│       │   │   └── GuidancePopup.tsx    # Probability prediction modal
│       │   ├── charts/
│       │   │   ├── PriceLineChart.tsx   # Recharts line chart
│       │   │   └── ScoreBar.tsx         # Score progress bar
│       │   └── shared/
│       │       ├── ProgressBar.tsx
│       │       ├── RadioOptionCard.tsx
│       │       └── AlertBanner.tsx
│       ├── types/index.ts            # All TypeScript interfaces
│       └── utils/format.ts           # Money/pct formatters, label maps
└── nginx/nginx.conf
```

---

## Database Schema (12 Tables)

1. **`experiments`** — Experiment config (JSON: periods, assets, distribution params, education version, group rules)
2. **`price_sequences`** — Pre-generated prices per experiment/round/stock/period
3. **`questionnaires`** — Question definitions (JSON) per experiment and phase
4. **`participants`** — Session token, group assignment, current step, demographics
5. **`questionnaire_responses`** — Each answer with correctness and response time
6. **`trading_sessions`** — Per round: starting/ending cash, PnL, fallacy score
7. **`trade_actions`** — Every buy/sell/hold with period, price, quantity, streak context
8. **`portfolio_snapshots`** — Portfolio state at each period (cash, holdings, value)
9. **`guidance_responses`** — Phase 2 probability predictions and bias flags
10. **`education_content`** — Education templates by bias level, version, and group
11. **`event_log`** — Catch-all audit trail (page visits, clicks, timestamps)
12. **`researchers`** — Admin accounts

---

## Experiment Flow & 4 Groups

```
Enter Platform → Demographics → Behavioral Test → Personality Feedback
                                                        │
        ┌───────────┬──────────────┬────────────────────┘
    Control      Feedback       Guidance      Feedback+Guidance
   (generic edu) (personalized) (generic edu)  (personalized)
        │            │              │                │
    Phase 1 Trading (all groups identical, 20+2 periods)
        │            │              │                │
    Settlement → Post-test → Analysis → Education
        │            │              │                │
   Phase 2:       Phase 2:      Phase 2:         Phase 2:
   No guidance    No guidance   WITH guidance    WITH guidance
        │            │              │                │
        └────────────┴──────────────┴────────────────┘
                    Final Results Comparison
```

**Group differences:**
- **Feedback dimension**: Control/Guidance get generic education; Feedback/Feedback+Guidance get personalized education based on Phase 1 bias level
- **Guidance dimension**: Control/Feedback have no pre-trade prompts in Phase 2; Guidance/Feedback+Guidance get probability prediction popups before each trade

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/join` | Enter experiment with code, get session token |
| POST | `/api/auth/admin/login` | Admin login |
| POST | `/api/demographics` | Submit demographics |
| GET | `/api/questionnaire/{phase}` | Get questions for phase |
| POST | `/api/questionnaire/{phase}/answer` | Submit one answer |
| POST | `/api/questionnaire/{phase}/complete` | Finish questionnaire, get score |
| POST | `/api/trading/start` | Initialize trading round |
| GET | `/api/trading/state` | Current period, prices, portfolio |
| POST | `/api/trading/action` | Execute buy/sell/hold, advance period |
| POST | `/api/trading/guidance-response` | Submit probability prediction (Phase 2) |
| POST | `/api/trading/complete` | Finish round, get settlement |
| GET | `/api/analysis/comprehensive` | Cognitive + behavioral profile |
| GET | `/api/analysis/final-results` | Round 1 vs Round 2 comparison |
| GET | `/api/education/content` | Personalized education content |
| POST | `/api/events/batch` | Batch event logging |
| GET/POST | `/api/admin/experiments` | Experiment list / create |
| PUT | `/api/admin/experiments/{id}` | Update experiment |
| GET | `/api/admin/experiments/{id}/stats` | Experiment statistics |
| GET | `/api/admin/experiments/{id}/participants` | Participant list |
| GET | `/api/admin/experiments/{id}/export/{type}` | Data export (CSV) |
| GET | `/api/health` | Health check |

---

## Price Generation

- **Pre-generated** when experiment is created (stored in DB)
- **Binary mode** (default): ±10% per period, each stock has its own up-probability (e.g., A=0.5)
- **Normal mode**: log-normal returns with configurable mean/std
- **Seeds stored** for reproducibility; Round 1 and Round 2 are independent sequences
- All participants in same experiment see identical prices

---

## Gambler's Fallacy Scoring

Two dimensions:
1. **Cognitive**: % of questionnaire questions answered correctly (recognizing independent events)
2. **Behavioral**: Proportion of trades that bet on streak reversal (buying after consecutive drops, selling after consecutive rises) among trades during streaks of length >= 2

Four investor profiles based on cognitive × behavioral:
- **理性投资者** (Rational): Good cognitive + good behavioral
- **知行不一型** (Know-but-don't-do): Good cognitive + poor behavioral
- **直觉正确型** (Intuitive): Poor cognitive + good behavioral
- **需要提升型** (Needs improvement): Poor cognitive + poor behavioral

---

## Implementation Status

### Completed (Phases 1-5)
- [x] FastAPI backend with all models, schemas, routes, and services
- [x] React + Vite + TypeScript + Tailwind frontend
- [x] Docker Compose + Nginx configuration
- [x] JWT auth for participants and admin
- [x] Price sequence generation (binary + normal modes)
- [x] Trading engine with validation, execution, streak tracking
- [x] Gambler's fallacy scoring (cognitive + behavioral)
- [x] Comprehensive analysis engine with investor profiles
- [x] Balanced random group assignment
- [x] All participant pages (join through final results)
- [x] Admin dashboard with CRUD, stats, data export
- [x] GuidancePopup for Phase 2 probability prediction
- [x] Questionnaire with 5 pre-test + 5 post-test questions
- [x] Education content (personalized by group/bias level)
- [x] Event logging system
- [x] SQLite compatibility for local development
- [x] Seed script with demo data
- [x] **"Academic Ink" frontend redesign** (20 files) — ink/amber palette, Noto Serif SC + IBM Plex Sans fonts, paper-texture backgrounds, fade-up animations, card-based layout, Chinese market color convention (red=up, green=down)
- [x] **Duplicate trading session bugfix** — `.limit(1)` guards on all session queries in `trading.py` and `analysis.py` to prevent `MultipleResultsFound` from React dev-mode double effects

### Remaining (Phases 6-7)
- [ ] Multi-stock mode (6 stocks with sparklines, market overview)
- [ ] Multi-stock trading engine (6 independent positions)
- [ ] Quantity input dialog for multi-stock mode
- [ ] Session resume (browser close/refresh recovery)
- [ ] Responsive design for mobile browsers
- [ ] Load testing (100 concurrent participants)
- [ ] Unit tests for services
- [ ] E2E test walkthrough for all 4 groups
- [ ] Cross-browser testing
- [ ] Alembic migration generation

---

## Configurable Parameters (Admin)

- Questionnaire content + whether to show explanations after answers
- Observation periods (default 2) before trading starts; total periods (default 20)
- Number of assets (currently 1, planned: 6)
- Asset return distribution (type, probability, change %)
- Education content version (text or comic)
- Whether guidance popup appears in Phase 2
- Group assignment method (balanced random, sequential)
- Initial cash (default 100,000)
- Price generation seeds (for reproducibility)
