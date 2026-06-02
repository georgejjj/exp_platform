from pydantic import BaseModel, Field


class GameRoundResult(BaseModel):
    round_number: int
    prediction: str
    obstacle_side: str
    predicted_correctly: bool
    jumped: bool
    coins_earned: int
    streak_length: int
    streak_direction: str | None


class GameStartResponse(BaseModel):
    session_id: str
    current_index: int
    total_intersections: int
    coins: int
    history: list[str] = Field(default_factory=list)
    status: str


class GameStateResponse(GameStartResponse):
    recent_results: list[GameRoundResult] = Field(default_factory=list)


class PredictRequest(BaseModel):
    prediction: str = Field(pattern="^[LR]$")
    response_time_ms: int | None = None


class PredictResponse(BaseModel):
    round_number: int
    prediction: str
    obstacle_side: str
    predicted_correctly: bool
    jumped: bool
    coins_earned: int
    total_coins: int
    history: list[str]
    is_last: bool
    next_index: int


class GameCompleteResponse(BaseModel):
    total_coins: int
    correct_count: int
    total_rounds: int
    fallacy_score: float | None
    streak_reversal_ratio: float | None
    cognitive_fallacy_score: float | None = None
    combined_score: float | None = None
    cognitive_weight: float = 0.4
    behavioral_weight: float = 0.6
    bias_level: str | None
    next_step: str
