import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, JSONType, UUIDType


class EventLog(Base):
    __tablename__ = "event_log"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("participants.id"))

    event_type: Mapped[str] = mapped_column(String(50), index=True)
    page: Mapped[str | None] = mapped_column(String(100))
    data: Mapped[dict | None] = mapped_column(JSONType)
    client_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    participant = relationship("Participant", back_populates="event_logs")
