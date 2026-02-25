import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, JSONType, UUIDType


class TradingSession(Base):
    __tablename__ = "trading_sessions"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("participants.id"))
    round_num: Mapped[int] = mapped_column(Integer)

    current_period: Mapped[int] = mapped_column(Integer, default=0)
    total_periods: Mapped[int] = mapped_column(Integer, default=20)
    observation_periods: Mapped[int] = mapped_column(Integer, default=2)
    status: Mapped[str] = mapped_column(String(20), default="active")

    initial_cash: Mapped[float] = mapped_column(Float, default=100000.0)
    final_cash: Mapped[float | None] = mapped_column(Float)
    final_portfolio_value: Mapped[float | None] = mapped_column(Float)
    pnl: Mapped[float | None] = mapped_column(Float)
    pnl_pct: Mapped[float | None] = mapped_column(Float)

    behavioral_fallacy_score: Mapped[float | None] = mapped_column(Float)
    streak_reversal_ratio: Mapped[float | None] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    participant = relationship("Participant", back_populates="trading_sessions")
    trade_actions = relationship("TradeAction", back_populates="trading_session", cascade="all, delete-orphan")
    portfolio_snapshots = relationship("PortfolioSnapshot", back_populates="trading_session", cascade="all, delete-orphan")


class TradeAction(Base):
    __tablename__ = "trade_actions"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    trading_session_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("trading_sessions.id"))
    period: Mapped[int] = mapped_column(Integer)
    stock_symbol: Mapped[str] = mapped_column(String(10))

    action: Mapped[str] = mapped_column(String(10))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    price: Mapped[float] = mapped_column(Float)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)

    streak_length: Mapped[int | None] = mapped_column(Integer)
    streak_direction: Mapped[str | None] = mapped_column(String(10))
    is_streak_reversal_bet: Mapped[bool | None] = mapped_column(Boolean)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    trading_session = relationship("TradingSession", back_populates="trade_actions")


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    id: Mapped[str] = mapped_column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    trading_session_id: Mapped[str] = mapped_column(UUIDType, ForeignKey("trading_sessions.id"))
    period: Mapped[int] = mapped_column(Integer)

    cash: Mapped[float] = mapped_column(Float)
    holdings: Mapped[dict] = mapped_column(JSONType, default=dict)
    total_value: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    trading_session = relationship("TradingSession", back_populates="portfolio_snapshots")
