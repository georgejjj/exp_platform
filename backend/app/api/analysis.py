from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_participant
from app.database import get_db
from app.models.participant import Participant
from app.models.questionnaire import QuestionnaireResponse
from app.models.trading import TradeAction, TradingSession
from app.schemas.analysis import (
    BehavioralDimension,
    CognitiveDimension,
    ComprehensiveAnalysis,
    FinalResults,
    InvestorProfile,
    RoundComparison,
)
from app.services.analysis_engine import build_comprehensive_analysis, build_final_results

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


async def _get_responses(participant_id, phase, db):
    result = await db.execute(
        select(QuestionnaireResponse).where(
            QuestionnaireResponse.participant_id == participant_id,
            QuestionnaireResponse.phase == phase,
        )
    )
    return [{"is_correct": r.is_correct} for r in result.scalars().all()]


async def _get_trades(participant_id, round_num, db):
    sess_result = await db.execute(
        select(TradingSession).where(
            TradingSession.participant_id == participant_id,
            TradingSession.round_num == round_num,
            TradingSession.status == "completed",
        ).order_by(TradingSession.completed_at.desc()).limit(1)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        return [], None
    trade_result = await db.execute(
        select(TradeAction).where(TradeAction.trading_session_id == session.id)
    )
    trades = [
        {
            "streak_length": t.streak_length,
            "is_streak_reversal_bet": t.is_streak_reversal_bet,
            "action": t.action,
            "quantity": t.quantity,
        }
        for t in trade_result.scalars().all()
    ]
    sess_dict = {
        "pnl": session.pnl,
        "pnl_pct": session.pnl_pct,
        "behavioral_fallacy_score": session.behavioral_fallacy_score,
    }
    return trades, sess_dict


@router.get("/comprehensive", response_model=ComprehensiveAnalysis)
async def get_comprehensive_analysis(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    pre = await _get_responses(participant.id, "pre_test", db)
    post = await _get_responses(participant.id, "post_test", db)
    r1_trades, _ = await _get_trades(participant.id, 1, db)
    r2_trades, _ = await _get_trades(participant.id, 2, db)

    result = build_comprehensive_analysis(
        pre, post, r1_trades, r2_trades, participant.group or "control"
    )

    return ComprehensiveAnalysis(
        cognitive=CognitiveDimension(**result["cognitive"]),
        behavioral=BehavioralDimension(**result["behavioral"]),
        profile=InvestorProfile(**result["profile"]),
        group=result["group"],
    )


@router.get("/final-results", response_model=FinalResults)
async def get_final_results(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    pre = await _get_responses(participant.id, "pre_test", db)
    post = await _get_responses(participant.id, "post_test", db)
    r1_trades, r1_session = await _get_trades(participant.id, 1, db)
    r2_trades, r2_session = await _get_trades(participant.id, 2, db)

    if not r1_session or not r2_session:
        raise HTTPException(
            status_code=400, detail="需要完成两轮交易才能查看最终结果"
        )

    result = build_final_results(
        pre, post, r1_session, r2_session, r1_trades, r2_trades,
        participant.group or "control",
    )

    return FinalResults(
        comparison=RoundComparison(**result["comparison"]),
        cognitive=CognitiveDimension(**result["cognitive"]),
        behavioral=BehavioralDimension(**result["behavioral"]),
        profile=InvestorProfile(**result["profile"]),
        group=result["group"],
        education_received=result["education_received"],
        had_guidance=result["had_guidance"],
    )
