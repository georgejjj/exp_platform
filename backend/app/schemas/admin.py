from pydantic import BaseModel


class ExperimentCreate(BaseModel):
    name: str
    code: str
    description: str | None = None
    config: dict = {}


class ExperimentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    config: dict | None = None


class ExperimentOut(BaseModel):
    id: str
    name: str
    code: str
    description: str | None
    status: str
    config: dict
    participant_count: int = 0
    created_at: str


class ParticipantSummary(BaseModel):
    id: str
    nickname: str | None
    group: str | None
    current_step: str
    bias_level: str | None
    created_at: str


class ExperimentStats(BaseModel):
    total_participants: int
    completed: int
    in_progress: int
    group_distribution: dict[str, int]
    step_distribution: dict[str, int]
