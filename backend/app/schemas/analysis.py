from pydantic import BaseModel


class CognitiveDimension(BaseModel):
    pre_test_score: float
    post_test_score: float
    improvement: float
    bias_level: str


class BehavioralDimension(BaseModel):
    round1_fallacy_score: float | None
    round2_fallacy_score: float | None
    improvement: float | None
    streak_reversal_ratio_r1: float | None
    streak_reversal_ratio_r2: float | None


class InvestorProfile(BaseModel):
    type_name: str  # e.g. "理性投资者", "知行不一型", etc.
    description: str
    consistency_score: float  # alignment between cognitive and behavioral


class ComprehensiveAnalysis(BaseModel):
    cognitive: CognitiveDimension
    behavioral: BehavioralDimension
    profile: InvestorProfile
    group: str


class RoundComparison(BaseModel):
    round1_pnl: float
    round1_pnl_pct: float
    round2_pnl: float
    round2_pnl_pct: float
    pnl_improvement: float
    round1_fallacy_score: float | None
    round2_fallacy_score: float | None
    fallacy_improvement: float | None


class FinalResults(BaseModel):
    comparison: RoundComparison
    cognitive: CognitiveDimension
    behavioral: BehavioralDimension
    profile: InvestorProfile
    group: str
    education_received: str
    had_guidance: bool
