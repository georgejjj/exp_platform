from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.experiment import Experiment
from app.models.participant import Participant
from app.models.researcher import Researcher
from app.schemas.auth import (
    AdminLoginRequest,
    AdminLoginResponse,
    JoinRequest,
    JoinResponse,
)
from app.services.group_assignment import assign_group
from app.utils.security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/join", response_model=JoinResponse)
async def join_experiment(req: JoinRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Experiment).where(
            Experiment.code == req.experiment_code,
            Experiment.status == "active",
        )
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="实验代码无效或实验未激活")

    method = experiment.config.get("group_assignment", "balanced_random")
    group = await assign_group(experiment.id, db, method)

    participant = Participant(
        experiment_id=experiment.id,
        session_token="",
        group=group,
        nickname=req.nickname,
        current_step="joined",
    )
    db.add(participant)
    await db.flush()

    token = create_access_token({"sub": str(participant.id), "type": "participant"})
    participant.session_token = token
    await db.commit()

    return JoinResponse(
        token=token,
        participant_id=str(participant.id),
        experiment_id=str(experiment.id),
        group=group,
        current_step="joined",
    )


@router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(req: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Researcher).where(Researcher.username == req.username)
    )
    researcher = result.scalar_one_or_none()
    if not researcher or not verify_password(req.password, researcher.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    token = create_access_token(
        {"sub": str(researcher.id), "type": "researcher"},
        expires_minutes=480,
    )
    return AdminLoginResponse(
        token=token,
        username=researcher.username,
        display_name=researcher.display_name,
    )
