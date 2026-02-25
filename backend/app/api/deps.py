from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.participant import Participant
from app.models.researcher import Researcher
from app.utils.security import decode_token

bearer_scheme = HTTPBearer()


async def get_current_participant(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Participant:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "participant":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    participant_id = payload.get("sub")
    result = await db.execute(
        select(Participant).where(Participant.id == participant_id)
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Participant not found")
    return participant


async def get_current_researcher(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Researcher:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "researcher":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    researcher_id = payload.get("sub")
    result = await db.execute(
        select(Researcher).where(Researcher.id == researcher_id)
    )
    researcher = result.scalar_one_or_none()
    if not researcher:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Researcher not found")
    return researcher
