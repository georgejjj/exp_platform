from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_participant
from app.database import get_db
from app.models.participant import Participant
from app.schemas.demographics import DemographicsRequest, DemographicsResponse

router = APIRouter(prefix="/api/demographics", tags=["demographics"])


@router.post("", response_model=DemographicsResponse)
async def submit_demographics(
    req: DemographicsRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    participant.gender = req.gender
    participant.age_range = req.age_range
    participant.education_level = req.education_level
    participant.investment_experience = req.investment_experience
    participant.risk_preference = req.risk_preference
    participant.demographics_extra = req.extra
    participant.current_step = "pre_test"
    await db.commit()

    return DemographicsResponse(success=True, next_step="pre_test")
