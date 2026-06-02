import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, JSONType, UUIDType


class RaceCarGameSession(Base):
    __tablename__ = "race_car_game_sessions"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("participants.id"))

    total_intersections: Mapped[int] = mapped_column(Integer, default=10)
    current_index: Mapped[int] = mapped_column(Integer, default=0)
    coins: Mapped[int] = mapped_column(Integer, default=1000)
    status: Mapped[str] = mapped_column(String(20), default="active")

    obstacle_sequence: Mapped[list] = mapped_column(JSONType, default=list)

    fallacy_score: Mapped[float | None] = mapped_column(Float)
    streak_reversal_ratio: Mapped[float | None] = mapped_column(Float)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    rounds = relationship(
        "RaceCarRound",
        back_populates="game_session",
        cascade="all, delete-orphan",
        order_by="RaceCarRound.round_number",
    )


class RaceCarRound(Base):
    __tablename__ = "race_car_rounds"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_session_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("race_car_game_sessions.id"))
    round_number: Mapped[int] = mapped_column(Integer)

    prediction: Mapped[str] = mapped_column(String(1))
    obstacle_side: Mapped[str] = mapped_column(String(1))
    predicted_correctly: Mapped[bool] = mapped_column(Boolean)
    jumped: Mapped[bool] = mapped_column(Boolean, default=False)
    coins_earned: Mapped[int] = mapped_column(Integer, default=0)

    streak_length: Mapped[int] = mapped_column(Integer, default=0)
    streak_direction: Mapped[str | None] = mapped_column(String(1))
    is_streak_reversal_prediction: Mapped[bool | None] = mapped_column(Boolean)

    response_time_ms: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    game_session = relationship("RaceCarGameSession", back_populates="rounds")
