import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, JSONType, UUIDType


class EducationContent(Base):
    __tablename__ = "education_content"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    experiment_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("experiments.id"))

    bias_level: Mapped[str] = mapped_column(String(20))
    version: Mapped[str] = mapped_column(String(20), default="text")
    group_type: Mapped[str] = mapped_column(String(30))

    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[dict] = mapped_column(JSONType, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    experiment = relationship("Experiment", back_populates="education_contents")
