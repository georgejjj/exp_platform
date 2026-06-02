import hashlib
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_participant
from app.database import get_db
from app.models.participant import Participant
from app.models.questionnaire import QuestionnaireResponse
from app.models.race_car_game import RaceCarGameSession, RaceCarRound
from app.schemas.race_car import (
    GameCompleteResponse,
    GameRoundResult,
    GameStartResponse,
    GameStateResponse,
    PredictRequest,
    PredictResponse,
)
from app.services.fallacy_scorer import (
    calculate_cognitive_score,
    calculate_game_fallacy_score,
    determine_bias_level,
)

COGNITIVE_WEIGHT = 0.4
BEHAVIORAL_WEIGHT = 0.6

router = APIRouter(prefix="/api/racecar", tags=["race-car-game"])

TOTAL_INTERSECTIONS = 10
STARTING_COINS = 1000
COIN_CORRECT = 30
COIN_JUMP = 10
JUMP_PROB = 0.3
HISTORY_LOOKBACK = 5


def _seed_for_participant(participant_id: str) -> int:
    """Deterministic seed per participant so the obstacle sequence is reproducible."""
    h = hashlib.sha256(participant_id.encode("utf-8")).hexdigest()
    return int(h[:8], 16)


def _generate_obstacle_sequence(participant_id: str) -> list[str]:
    """10 fair coin flips, regenerated until the sequence contains at least one
    streak of length >= 3 so the gambler's-fallacy measurement has signal."""
    rng = random.Random(_seed_for_participant(participant_id))
    for _ in range(50):
        seq = [rng.choice(["L", "R"]) for _ in range(TOTAL_INTERSECTIONS)]
        if _max_streak(seq) >= 3:
            return seq
    return seq  # fallback


def _max_streak(seq: list[str]) -> int:
    best = cur = 0
    last = None
    for s in seq:
        cur = cur + 1 if s == last else 1
        best = max(best, cur)
        last = s
    return best


def _streak_at(seq: list[str], idx: int) -> tuple[int, str | None]:
    """Length and direction of the same-side streak in seq[:idx]."""
    if idx <= 0:
        return 0, None
    last = seq[idx - 1]
    length = 1
    for j in range(idx - 2, -1, -1):
        if seq[j] == last:
            length += 1
        else:
            break
    return length, last


async def _get_or_create_session(
    participant: Participant, db: AsyncSession
) -> RaceCarGameSession:
    result = await db.execute(
        select(RaceCarGameSession)
        .where(
            RaceCarGameSession.participant_id == participant.id,
            RaceCarGameSession.status == "active",
        )
        .order_by(RaceCarGameSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if session:
        return session

    session = RaceCarGameSession(
        participant_id=participant.id,
        total_intersections=TOTAL_INTERSECTIONS,
        current_index=0,
        coins=STARTING_COINS,
        status="active",
        obstacle_sequence=_generate_obstacle_sequence(participant.id),
    )
    db.add(session)
    await db.flush()
    return session


def _history(session: RaceCarGameSession) -> list[str]:
    """Recently revealed obstacle sides, oldest first, capped to HISTORY_LOOKBACK."""
    revealed = session.obstacle_sequence[: session.current_index]
    return revealed[-HISTORY_LOOKBACK:]


@router.post("/start", response_model=GameStartResponse)
async def start_game(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_or_create_session(participant, db)
    if participant.current_step in ("joined", "demographics", "pre_test"):
        participant.current_step = "race_car_game"
    await db.commit()

    return GameStartResponse(
        session_id=str(session.id),
        current_index=session.current_index,
        total_intersections=session.total_intersections,
        coins=session.coins,
        history=_history(session),
        status=session.status,
    )


@router.get("/state", response_model=GameStateResponse)
async def get_state(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RaceCarGameSession)
        .where(RaceCarGameSession.participant_id == participant.id)
        .order_by(RaceCarGameSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="未找到小游戏会话")

    rounds_result = await db.execute(
        select(RaceCarRound)
        .where(RaceCarRound.game_session_id == session.id)
        .order_by(RaceCarRound.round_number.desc())
        .limit(HISTORY_LOOKBACK)
    )
    recent_rows = list(reversed(rounds_result.scalars().all()))

    recent = [
        GameRoundResult(
            round_number=r.round_number,
            prediction=r.prediction,
            obstacle_side=r.obstacle_side,
            predicted_correctly=r.predicted_correctly,
            jumped=r.jumped,
            coins_earned=r.coins_earned,
            streak_length=r.streak_length,
            streak_direction=r.streak_direction,
        )
        for r in recent_rows
    ]

    return GameStateResponse(
        session_id=str(session.id),
        current_index=session.current_index,
        total_intersections=session.total_intersections,
        coins=session.coins,
        history=_history(session),
        status=session.status,
        recent_results=recent,
    )


@router.post("/predict", response_model=PredictResponse)
async def submit_prediction(
    req: PredictRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RaceCarGameSession)
        .where(
            RaceCarGameSession.participant_id == participant.id,
            RaceCarGameSession.status == "active",
        )
        .order_by(RaceCarGameSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="未找到进行中的小游戏会话")

    if session.current_index >= session.total_intersections:
        raise HTTPException(status_code=400, detail="小游戏已结束")

    idx = session.current_index
    obstacle = session.obstacle_sequence[idx]
    predicted_correctly = req.prediction == obstacle

    streak_length, streak_direction = _streak_at(session.obstacle_sequence, idx)
    is_reversal = None
    if streak_length >= 2 and streak_direction is not None:
        is_reversal = req.prediction != streak_direction

    jumped = False
    if predicted_correctly:
        coins = COIN_CORRECT
    else:
        rng = random.Random(_seed_for_participant(participant.id) + idx + 1)
        jumped = rng.random() < JUMP_PROB
        coins = COIN_JUMP if jumped else 0

    round_record = RaceCarRound(
        game_session_id=session.id,
        round_number=idx + 1,
        prediction=req.prediction,
        obstacle_side=obstacle,
        predicted_correctly=predicted_correctly,
        jumped=jumped,
        coins_earned=coins,
        streak_length=streak_length,
        streak_direction=streak_direction,
        is_streak_reversal_prediction=is_reversal,
        response_time_ms=req.response_time_ms,
    )
    db.add(round_record)

    session.current_index = idx + 1
    session.coins += coins
    if predicted_correctly:
        session.correct_count += 1
    await db.commit()

    is_last = session.current_index >= session.total_intersections
    return PredictResponse(
        round_number=idx + 1,
        prediction=req.prediction,
        obstacle_side=obstacle,
        predicted_correctly=predicted_correctly,
        jumped=jumped,
        coins_earned=coins,
        total_coins=session.coins,
        history=_history(session),
        is_last=is_last,
        next_index=session.current_index,
    )


@router.post("/complete", response_model=GameCompleteResponse)
async def complete_game(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RaceCarGameSession)
        .where(RaceCarGameSession.participant_id == participant.id)
        .order_by(RaceCarGameSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="未找到小游戏会话")

    if session.current_index < session.total_intersections:
        raise HTTPException(status_code=400, detail="小游戏尚未完成")

    rounds_result = await db.execute(
        select(RaceCarRound)
        .where(RaceCarRound.game_session_id == session.id)
        .order_by(RaceCarRound.round_number)
    )
    rounds = rounds_result.scalars().all()

    round_dicts = [
        {
            "streak_length": r.streak_length,
            "is_streak_reversal_prediction": r.is_streak_reversal_prediction,
        }
        for r in rounds
    ]
    score, ratio = calculate_game_fallacy_score(round_dicts)
    session.fallacy_score = score
    session.streak_reversal_ratio = ratio
    if session.status != "completed":
        session.status = "completed"
        session.completed_at = datetime.now(timezone.utc)

    # Compute the actual pre-test cognitive fallacy score from the participant's
    # questionnaire responses (rather than the bucketed bias_level) so the combined
    # number matches what the UI shows.
    qresult = await db.execute(
        select(QuestionnaireResponse).where(
            QuestionnaireResponse.participant_id == participant.id,
            QuestionnaireResponse.phase == "pre_test",
        )
    )
    qresponses = qresult.scalars().all()
    cognitive_fallacy_score: float | None = None
    if qresponses:
        correctness, _, _ = calculate_cognitive_score(
            [{"is_correct": r.is_correct} for r in qresponses]
        )
        cognitive_fallacy_score = round(100 - correctness, 1)

    combined: float | None = None
    if cognitive_fallacy_score is not None and score is not None:
        combined = round(
            COGNITIVE_WEIGHT * cognitive_fallacy_score + BEHAVIORAL_WEIGHT * score, 1
        )
        participant.bias_level = determine_bias_level(combined)
    elif score is not None:
        combined = score
        participant.bias_level = determine_bias_level(score)
    elif cognitive_fallacy_score is not None:
        combined = cognitive_fallacy_score

    participant.current_step = "personality_feedback"
    await db.commit()

    return GameCompleteResponse(
        total_coins=session.coins,
        correct_count=session.correct_count,
        total_rounds=session.total_intersections,
        fallacy_score=score,
        streak_reversal_ratio=ratio,
        cognitive_fallacy_score=cognitive_fallacy_score,
        combined_score=combined,
        cognitive_weight=COGNITIVE_WEIGHT,
        behavioral_weight=BEHAVIORAL_WEIGHT,
        bias_level=participant.bias_level,
        next_step="personality_feedback",
    )
