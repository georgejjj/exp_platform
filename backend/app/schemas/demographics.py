from pydantic import BaseModel


class DemographicsRequest(BaseModel):
    gender: str
    age_range: str
    education_level: str
    investment_experience: str
    risk_preference: str
    extra: dict | None = None


class DemographicsResponse(BaseModel):
    success: bool
    next_step: str
