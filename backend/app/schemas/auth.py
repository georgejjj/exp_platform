from pydantic import BaseModel


class JoinRequest(BaseModel):
    experiment_code: str
    nickname: str | None = None


class JoinResponse(BaseModel):
    token: str
    participant_id: str
    experiment_id: str
    group: str | None
    current_step: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    username: str
    display_name: str | None
