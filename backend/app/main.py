from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, demographics, questionnaire, trading, analysis, education, events, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="财智方舟 - Behavioral Finance Experiment Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(demographics.router)
app.include_router(questionnaire.router)
app.include_router(trading.router)
app.include_router(analysis.router)
app.include_router(education.router)
app.include_router(events.router)
app.include_router(admin.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
