from pydantic import BaseModel


class StockPrice(BaseModel):
    symbol: str
    price: float
    direction: str | None = None  # "up" or "down"
    change_pct: float | None = None


class HoldingInfo(BaseModel):
    symbol: str
    quantity: int
    avg_cost: float
    current_price: float
    market_value: float
    pnl: float
    pnl_pct: float


class TradingStartRequest(BaseModel):
    round_num: int  # 1 or 2


class TradingState(BaseModel):
    session_id: str
    round_num: int
    current_period: int
    total_periods: int
    observation_periods: int
    is_observation: bool
    status: str
    cash: float
    holdings: list[HoldingInfo]
    total_value: float
    prices: list[StockPrice]
    price_history: list[list[StockPrice]]  # past periods' prices
    pnl: float
    pnl_pct: float


class TradeActionRequest(BaseModel):
    stock_symbol: str
    action: str  # buy, sell, hold
    quantity: int = 0


class TradeActionResponse(BaseModel):
    success: bool
    message: str
    new_cash: float
    period_advanced: bool
    new_period: int
    is_last_period: bool


class GuidanceSubmitRequest(BaseModel):
    stock_symbol: str
    predicted_up_prob: float
    response_time_ms: int | None = None


class GuidanceSubmitResponse(BaseModel):
    actual_up_prob: float
    shows_bias: bool
    bias_message: str | None = None


class SettlementResponse(BaseModel):
    round_num: int
    initial_cash: float
    final_cash: float
    final_portfolio_value: float
    pnl: float
    pnl_pct: float
    total_trades: int
    behavioral_fallacy_score: float | None
    streak_reversal_ratio: float | None
    next_step: str
