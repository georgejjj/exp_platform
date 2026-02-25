import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UUIDType


class GuidanceResponse(Base):
    __tablename__ = "guidance_responses"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("participants.id"))
    trading_session_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("trading_sessions.id"))

    period: Mapped[int] = mapped_column(Integer)
    stock_symbol: Mapped[str] = mapped_column(String(10))

    predicted_up_prob: Mapped[float] = mapped_column(Float)
    actual_up_prob: Mapped[float] = mapped_column(Float)

    shows_bias: Mapped[bool] = mapped_column(Boolean, default=False)
    bias_type: Mapped[str | None] = mapped_column(String(30))

    streak_length: Mapped[int | None] = mapped_column(Integer)
    streak_direction: Mapped[str | None] = mapped_column(String(10))

    response_time_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    participant = relationship("Participant", back_populates="guidance_responses")
