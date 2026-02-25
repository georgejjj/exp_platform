import csv
import io
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event_log import EventLog
from app.models.participant import Participant
from app.models.questionnaire import QuestionnaireResponse
from app.models.trading import TradeAction, TradingSession


async def export_trades_csv(experiment_id: UUID, db: AsyncSession) -> bytes:
    result = await db.execute(
        select(Participant).where(Participant.experiment_id == experiment_id)
    )
    participants = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "participant_id", "nickname", "group", "round", "period",
        "stock", "action", "quantity", "price", "total_amount",
        "streak_length", "streak_direction", "is_reversal_bet", "timestamp",
    ])

    for p in participants:
        sessions = await db.execute(
            select(TradingSession).where(TradingSession.participant_id == p.id)
        )
        for sess in sessions.scalars().all():
            trades = await db.execute(
                select(TradeAction)
                .where(TradeAction.trading_session_id == sess.id)
                .order_by(TradeAction.period)
            )
            for t in trades.scalars().all():
                writer.writerow([
                    str(p.id), p.nickname, p.group, sess.round_num, t.period,
                    t.stock_symbol, t.action, t.quantity, t.price, t.total_amount,
                    t.streak_length, t.streak_direction, t.is_streak_reversal_bet,
                    t.created_at.isoformat() if t.created_at else "",
                ])

    return output.getvalue().encode("utf-8-sig")


async def export_questionnaires_csv(experiment_id: UUID, db: AsyncSession) -> bytes:
    result = await db.execute(
        select(Participant).where(Participant.experiment_id == experiment_id)
    )
    participants = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "participant_id", "nickname", "group", "phase", "question_id",
        "selected_option", "is_correct", "response_time_ms", "timestamp",
    ])

    for p in participants:
        responses = await db.execute(
            select(QuestionnaireResponse)
            .where(QuestionnaireResponse.participant_id == p.id)
        )
        for r in responses.scalars().all():
            writer.writerow([
                str(p.id), p.nickname, p.group, r.phase, r.question_id,
                r.selected_option, r.is_correct, r.response_time_ms,
                r.created_at.isoformat() if r.created_at else "",
            ])

    return output.getvalue().encode("utf-8-sig")


async def export_events_csv(experiment_id: UUID, db: AsyncSession) -> bytes:
    result = await db.execute(
        select(Participant).where(Participant.experiment_id == experiment_id)
    )
    participants = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "participant_id", "nickname", "event_type", "page", "data",
        "client_timestamp", "server_timestamp",
    ])

    for p in participants:
        events = await db.execute(
            select(EventLog)
            .where(EventLog.participant_id == p.id)
            .order_by(EventLog.created_at)
        )
        for e in events.scalars().all():
            writer.writerow([
                str(p.id), p.nickname, e.event_type, e.page,
                str(e.data) if e.data else "",
                e.client_timestamp.isoformat() if e.client_timestamp else "",
                e.created_at.isoformat() if e.created_at else "",
            ])

    return output.getvalue().encode("utf-8-sig")
