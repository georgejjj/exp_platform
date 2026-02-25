from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_participant
from app.database import get_db
from app.models.experiment import Experiment, PriceSequence
from app.models.guidance import GuidanceResponse
from app.models.participant import Participant
from app.models.trading import PortfolioSnapshot, TradeAction, TradingSession
from app.schemas.trading import (
    GuidanceSubmitRequest,
    GuidanceSubmitResponse,
    HoldingInfo,
    SettlementResponse,
    StockPrice,
    TradeActionRequest,
    TradeActionResponse,
    TradingStartRequest,
    TradingState,
)
from app.services.fallacy_scorer import calculate_behavioral_score
from app.services.trading_engine import (
    calculate_streak,
    execute_trade,
    is_streak_reversal_bet,
    validate_trade,
)

router = APIRouter(prefix="/api/trading", tags=["trading"])


async def _get_prices(
    experiment_id: str, round_num: int, db: AsyncSession
) -> list[dict]:
    result = await db.execute(
        select(PriceSequence)
        .where(
            PriceSequence.experiment_id == experiment_id,
            PriceSequence.round_num == round_num,
        )
        .order_by(PriceSequence.stock_symbol, PriceSequence.period)
    )
    return [
        {
            "stock_symbol": p.stock_symbol,
            "period": p.period,
            "price": p.price,
            "direction": p.direction,
        }
        for p in result.scalars().all()
    ]


async def _get_latest_snapshot(
    session_id: str, db: AsyncSession
) -> PortfolioSnapshot | None:
    result = await db.execute(
        select(PortfolioSnapshot)
        .where(PortfolioSnapshot.trading_session_id == session_id)
        .order_by(PortfolioSnapshot.period.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.post("/start", response_model=TradingState)
async def start_trading(
    req: TradingStartRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    experiment = await db.get(Experiment, participant.experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")

    config = experiment.config
    total_periods = config.get("total_periods", 20) + config.get("observation_periods", 2)
    initial_cash = config.get("initial_cash", 100000)

    # First check for an active session to resume
    active_result = await db.execute(
        select(TradingSession).where(
            TradingSession.participant_id == participant.id,
            TradingSession.round_num == req.round_num,
            TradingSession.status == "active",
        ).limit(1)
    )
    session = active_result.scalar_one_or_none()

    if session:
        pass  # resume
    else:
        session = TradingSession(
            participant_id=participant.id,
            round_num=req.round_num,
            total_periods=total_periods,
            observation_periods=config.get("observation_periods", 2),
            initial_cash=initial_cash,
            current_period=0,
        )
        db.add(session)
        await db.flush()

        snapshot = PortfolioSnapshot(
            trading_session_id=session.id,
            period=0,
            cash=initial_cash,
            holdings={},
            total_value=initial_cash,
        )
        db.add(snapshot)

        step = "phase1_trading" if req.round_num == 1 else "phase2_trading"
        participant.current_step = step
        await db.commit()

    return await _build_trading_state(session, participant, db)


@router.get("/state", response_model=TradingState)
async def get_trading_state(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    round_num = 2 if "phase2" in (participant.current_step or "") else 1
    result = await db.execute(
        select(TradingSession).where(
            TradingSession.participant_id == participant.id,
            TradingSession.round_num == round_num,
            TradingSession.status == "active",
        ).order_by(TradingSession.created_at.desc()).limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="没有进行中的交易")

    return await _build_trading_state(session, participant, db)


@router.post("/action", response_model=TradeActionResponse)
async def submit_trade_action(
    req: TradeActionRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    round_num = 2 if "phase2" in (participant.current_step or "") else 1
    result = await db.execute(
        select(TradingSession).where(
            TradingSession.participant_id == participant.id,
            TradingSession.round_num == round_num,
            TradingSession.status == "active",
        ).order_by(TradingSession.created_at.desc()).limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="没有进行中的交易")

    if session.current_period < session.observation_periods and req.action != "hold":
        raise HTTPException(status_code=400, detail="观察期内只能观望")

    snapshot = await _get_latest_snapshot(session.id, db)
    cash = snapshot.cash
    holdings = dict(snapshot.holdings) if snapshot.holdings else {}

    prices = await _get_prices(participant.experiment_id, round_num, db)
    current_prices = {
        p["stock_symbol"]: p for p in prices if p["period"] == session.current_period
    }

    price_info = current_prices.get(req.stock_symbol)
    if not price_info:
        raise HTTPException(status_code=400, detail="股票代码无效")

    price = price_info["price"]

    valid, msg = validate_trade(
        req.action, req.quantity, price, cash, holdings, req.stock_symbol
    )
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    streak_len, streak_dir = calculate_streak(
        [p for p in prices if p["period"] <= session.current_period],
        req.stock_symbol,
    )
    reversal_bet = is_streak_reversal_bet(req.action, req.quantity, streak_dir)

    new_cash, new_holdings = execute_trade(
        req.action, req.quantity, price, cash, holdings, req.stock_symbol
    )

    trade = TradeAction(
        trading_session_id=session.id,
        period=session.current_period,
        stock_symbol=req.stock_symbol,
        action=req.action,
        quantity=req.quantity,
        price=price,
        total_amount=round(req.quantity * price, 2),
        streak_length=streak_len,
        streak_direction=streak_dir,
        is_streak_reversal_bet=reversal_bet,
    )
    db.add(trade)

    session.current_period += 1
    is_last = session.current_period >= session.total_periods

    # Calculate total value at new period
    next_prices = {
        p["stock_symbol"]: p for p in prices if p["period"] == session.current_period
    }
    total_value = new_cash
    for sym, h in new_holdings.items():
        p = next_prices.get(sym, current_prices.get(sym))
        if p:
            total_value += h["quantity"] * p["price"]

    new_snapshot = PortfolioSnapshot(
        trading_session_id=session.id,
        period=session.current_period,
        cash=new_cash,
        holdings=new_holdings,
        total_value=round(total_value, 2),
    )
    db.add(new_snapshot)
    await db.commit()

    return TradeActionResponse(
        success=True,
        message="交易成功" if req.action != "hold" else "已观望",
        new_cash=new_cash,
        period_advanced=True,
        new_period=session.current_period,
        is_last_period=is_last,
    )


@router.post("/guidance-response", response_model=GuidanceSubmitResponse)
async def submit_guidance_response(
    req: GuidanceSubmitRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TradingSession).where(
            TradingSession.participant_id == participant.id,
            TradingSession.round_num == 2,
            TradingSession.status == "active",
        ).order_by(TradingSession.created_at.desc()).limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="没有进行中的交易")

    experiment = await db.get(Experiment, participant.experiment_id)
    assets = experiment.config.get("assets", [])
    asset = next((a for a in assets if a["symbol"] == req.stock_symbol), None)
    actual_prob = asset["up_prob"] if asset else 0.5

    prices = await _get_prices(participant.experiment_id, 2, db)
    streak_len, streak_dir = calculate_streak(
        [p for p in prices if p["period"] <= session.current_period],
        req.stock_symbol,
    )

    shows_bias = False
    bias_type = None
    bias_message = None

    if streak_len >= 2:
        if streak_dir == "up" and req.predicted_up_prob < actual_prob - 0.15:
            shows_bias = True
            bias_type = "gambler_fallacy"
            bias_message = (
                f"提示：该股票连续上涨{streak_len}期，但每期上涨概率仍为"
                f"{actual_prob * 100:.0f}%，不会因为之前的走势而改变。"
            )
        elif streak_dir == "down" and req.predicted_up_prob > actual_prob + 0.15:
            shows_bias = True
            bias_type = "gambler_fallacy"
            bias_message = (
                f"提示：该股票连续下跌{streak_len}期，但每期上涨概率仍为"
                f"{actual_prob * 100:.0f}%，不会因为之前的走势而改变。"
            )

    guidance = GuidanceResponse(
        participant_id=participant.id,
        trading_session_id=session.id,
        period=session.current_period,
        stock_symbol=req.stock_symbol,
        predicted_up_prob=req.predicted_up_prob,
        actual_up_prob=actual_prob,
        shows_bias=shows_bias,
        bias_type=bias_type,
        streak_length=streak_len,
        streak_direction=streak_dir,
        response_time_ms=req.response_time_ms,
    )
    db.add(guidance)
    await db.commit()

    return GuidanceSubmitResponse(
        actual_up_prob=actual_prob,
        shows_bias=shows_bias,
        bias_message=bias_message,
    )


@router.post("/complete", response_model=SettlementResponse)
async def complete_trading(
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    round_num = 2 if "phase2" in (participant.current_step or "") else 1
    result = await db.execute(
        select(TradingSession).where(
            TradingSession.participant_id == participant.id,
            TradingSession.round_num == round_num,
            TradingSession.status == "active",
        ).order_by(TradingSession.created_at.desc()).limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="没有进行中的交易")

    snapshot = await _get_latest_snapshot(session.id, db)

    prices = await _get_prices(participant.experiment_id, round_num, db)
    last_period = session.current_period - 1 if session.current_period > 0 else 0
    final_prices = {
        p["stock_symbol"]: p["price"]
        for p in prices
        if p["period"] == last_period
    }

    final_cash = snapshot.cash
    for sym, h in (snapshot.holdings or {}).items():
        final_cash += h["quantity"] * final_prices.get(sym, 0)

    final_cash = round(final_cash, 2)
    pnl = round(final_cash - session.initial_cash, 2)
    pnl_pct = round(pnl / session.initial_cash * 100, 2)

    trade_result = await db.execute(
        select(TradeAction).where(TradeAction.trading_session_id == session.id)
    )
    trades = trade_result.scalars().all()
    trade_dicts = [
        {
            "streak_length": t.streak_length,
            "is_streak_reversal_bet": t.is_streak_reversal_bet,
        }
        for t in trades
    ]
    b_score, b_ratio = calculate_behavioral_score(trade_dicts)

    session.status = "completed"
    session.final_cash = final_cash
    session.final_portfolio_value = final_cash
    session.pnl = pnl
    session.pnl_pct = pnl_pct
    session.behavioral_fallacy_score = b_score
    session.streak_reversal_ratio = b_ratio
    session.completed_at = datetime.now(timezone.utc)

    if round_num == 1:
        participant.current_step = "post_test"
        next_step = "post_test"
    else:
        participant.current_step = "final_results"
        next_step = "final_results"

    await db.commit()

    return SettlementResponse(
        round_num=round_num,
        initial_cash=session.initial_cash,
        final_cash=final_cash,
        final_portfolio_value=final_cash,
        pnl=pnl,
        pnl_pct=pnl_pct,
        total_trades=len([t for t in trades if t.action != "hold"]),
        behavioral_fallacy_score=b_score,
        streak_reversal_ratio=b_ratio,
        next_step=next_step,
    )


async def _build_trading_state(
    session: TradingSession,
    participant: Participant,
    db: AsyncSession,
) -> TradingState:
    prices = await _get_prices(participant.experiment_id, session.round_num, db)
    snapshot = await _get_latest_snapshot(session.id, db)

    current_prices = [
        p for p in prices if p["period"] == session.current_period
    ]
    stock_prices = [
        StockPrice(
            symbol=p["stock_symbol"],
            price=p["price"],
            direction=p["direction"],
        )
        for p in current_prices
    ]

    history = []
    for period in range(session.current_period + 1):
        period_prices = [
            StockPrice(
                symbol=p["stock_symbol"],
                price=p["price"],
                direction=p["direction"],
            )
            for p in prices
            if p["period"] == period
        ]
        history.append(period_prices)

    holdings_list = []
    for sym, h in (snapshot.holdings or {}).items():
        cp = next(
            (p for p in current_prices if p["stock_symbol"] == sym), None
        )
        current_price = cp["price"] if cp else h["avg_cost"]
        qty = h["quantity"]
        mv = round(qty * current_price, 2)
        cost_basis = round(qty * h["avg_cost"], 2)
        pnl_val = round(mv - cost_basis, 2)
        pnl_pct_val = round(pnl_val / cost_basis * 100, 2) if cost_basis > 0 else 0
        holdings_list.append(HoldingInfo(
            symbol=sym,
            quantity=qty,
            avg_cost=h["avg_cost"],
            current_price=current_price,
            market_value=mv,
            pnl=pnl_val,
            pnl_pct=pnl_pct_val,
        ))

    total_value = snapshot.total_value if snapshot else session.initial_cash
    initial = session.initial_cash
    pnl = round(total_value - initial, 2)
    pnl_pct = round(pnl / initial * 100, 2) if initial > 0 else 0

    return TradingState(
        session_id=str(session.id),
        round_num=session.round_num,
        current_period=session.current_period,
        total_periods=session.total_periods,
        observation_periods=session.observation_periods,
        is_observation=session.current_period < session.observation_periods,
        status=session.status,
        cash=snapshot.cash if snapshot else initial,
        holdings=holdings_list,
        total_value=total_value,
        prices=stock_prices,
        price_history=history,
        pnl=pnl,
        pnl_pct=pnl_pct,
    )
