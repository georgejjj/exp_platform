import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, JSONType, UUIDType


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")

    config: Mapped[dict] = mapped_column(JSONType, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    participants = relationship("Participant", back_populates="experiment")
    price_sequences = relationship("PriceSequence", back_populates="experiment", cascade="all, delete-orphan")
    questionnaires = relationship("Questionnaire", back_populates="experiment", cascade="all, delete-orphan")
    education_contents = relationship("EducationContent", back_populates="experiment", cascade="all, delete-orphan")


class PriceSequence(Base):
    __tablename__ = "price_sequences"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    experiment_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("experiments.id"))
    round_num: Mapped[int] = mapped_column(Integer)
    stock_symbol: Mapped[str] = mapped_column(String(10))
    period: Mapped[int] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Float)
    direction: Mapped[str | None] = mapped_column(String(10))

    experiment = relationship("Experiment", back_populates="price_sequences")
