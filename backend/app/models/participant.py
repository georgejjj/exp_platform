import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, JSONType, UUIDType


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    experiment_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("experiments.id"))
    session_token: Mapped[str] = mapped_column(String(500), unique=True, index=True)

    group: Mapped[str | None] = mapped_column(String(30))
    current_step: Mapped[str] = mapped_column(String(50), default="joined")

    gender: Mapped[str | None] = mapped_column(String(10))
    age_range: Mapped[str | None] = mapped_column(String(20))
    education_level: Mapped[str | None] = mapped_column(String(30))
    investment_experience: Mapped[str | None] = mapped_column(String(30))
    risk_preference: Mapped[str | None] = mapped_column(String(30))
    demographics_extra: Mapped[dict | None] = mapped_column(JSONType)

    bias_level: Mapped[str | None] = mapped_column(String(20))
    nickname: Mapped[str | None] = mapped_column(String(50))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    experiment = relationship("Experiment", back_populates="participants")
    questionnaire_responses = relationship("QuestionnaireResponse", back_populates="participant", cascade="all, delete-orphan")
    trading_sessions = relationship("TradingSession", back_populates="participant", cascade="all, delete-orphan")
    guidance_responses = relationship("GuidanceResponse", back_populates="participant", cascade="all, delete-orphan")
    event_logs = relationship("EventLog", back_populates="participant", cascade="all, delete-orphan")
