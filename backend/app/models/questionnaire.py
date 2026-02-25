import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, JSONType, UUIDType


class Questionnaire(Base):
    __tablename__ = "questionnaires"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    experiment_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("experiments.id"))
    phase: Mapped[str] = mapped_column(String(30))
    questions: Mapped[list] = mapped_column(JSONType, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    experiment = relationship("Experiment", back_populates="questionnaires")


class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("participants.id"))
    questionnaire_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("questionnaires.id"))
    question_id: Mapped[str] = mapped_column(String(50))
    phase: Mapped[str] = mapped_column(String(30))

    selected_option: Mapped[str] = mapped_column(String(10))
    is_correct: Mapped[bool | None] = mapped_column(Boolean, default=None)
    response_time_ms: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    participant = relationship("Participant", back_populates="questionnaire_responses")
