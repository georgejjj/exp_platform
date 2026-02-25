from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_researcher
from app.database import get_db
from app.models.experiment import Experiment, PriceSequence
from app.models.participant import Participant
from app.models.researcher import Researcher
from app.schemas.admin import (
    ExperimentCreate,
    ExperimentOut,
    ExperimentStats,
    ExperimentUpdate,
    ParticipantSummary,
)
from app.services.data_exporter import (
    export_events_csv,
    export_questionnaires_csv,
    export_trades_csv,
)
from app.services.price_generator import generate_experiment_prices

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/experiments", response_model=list[ExperimentOut])
async def list_experiments(
    researcher: Researcher = Depends(get_current_researcher),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Experiment).order_by(Experiment.created_at.desc())
    )
    experiments = result.scalars().all()

    out = []
    for exp in experiments:
        count_result = await db.execute(
            select(func.count()).where(Participant.experiment_id == exp.id)
        )
        count = count_result.scalar() or 0
        out.append(ExperimentOut(
            id=str(exp.id),
            name=exp.name,
            code=exp.code,
            description=exp.description,
            status=exp.status,
            config=exp.config,
            participant_count=count,
            created_at=exp.created_at.isoformat(),
        ))
    return out


@router.post("/experiments", response_model=ExperimentOut)
async def create_experiment(
    req: ExperimentCreate,
    researcher: Researcher = Depends(get_current_researcher),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Experiment).where(Experiment.code == req.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="实验代码已存在")

    config = {
        "total_periods": 20,
        "observation_periods": 2,
        "num_assets": 1,
        "initial_cash": 100000,
        "price_mode": "binary",
        "assets": [
            {
                "symbol": "A",
                "name": "股票A",
                "initial_price": 100,
                "up_prob": 0.5,
                "change_pct": 0.1,
            }
        ],
        "seed_round1": 42,
        "seed_round2": 123,
        "education_version": "text",
        "show_explanations": True,
        "group_assignment": "balanced_random",
        **req.config,
    }

    experiment = Experiment(
        name=req.name,
        code=req.code,
        description=req.description,
        config=config,
    )
    db.add(experiment)
    await db.flush()

    for round_num in [1, 2]:
        prices = generate_experiment_prices(config, round_num)
        for p in prices:
            ps = PriceSequence(
                experiment_id=experiment.id,
                round_num=p["round_num"],
                stock_symbol=p["stock_symbol"],
                period=p["period"],
                price=p["price"],
                direction=p["direction"],
            )
            db.add(ps)

    await db.commit()

    return ExperimentOut(
        id=str(experiment.id),
        name=experiment.name,
        code=experiment.code,
        description=experiment.description,
        status=experiment.status,
        config=experiment.config,
        participant_count=0,
        created_at=experiment.created_at.isoformat(),
    )


@router.put("/experiments/{experiment_id}", response_model=ExperimentOut)
async def update_experiment(
    experiment_id: str,
    req: ExperimentUpdate,
    researcher: Researcher = Depends(get_current_researcher),
    db: AsyncSession = Depends(get_db),
):
    experiment = await db.get(Experiment, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="实验不存在")

    if req.name is not None:
        experiment.name = req.name
    if req.description is not None:
        experiment.description = req.description
    if req.status is not None:
        experiment.status = req.status
    if req.config is not None:
        experiment.config = {**experiment.config, **req.config}

    await db.commit()

    count_result = await db.execute(
        select(func.count()).where(Participant.experiment_id == experiment.id)
    )
    count = count_result.scalar() or 0

    return ExperimentOut(
        id=str(experiment.id),
        name=experiment.name,
        code=experiment.code,
        description=experiment.description,
        status=experiment.status,
        config=experiment.config,
        participant_count=count,
        created_at=experiment.created_at.isoformat(),
    )


@router.get("/experiments/{experiment_id}/stats", response_model=ExperimentStats)
async def get_experiment_stats(
    experiment_id: str,
    researcher: Researcher = Depends(get_current_researcher),
    db: AsyncSession = Depends(get_db),
):
    eid = experiment_id
    result = await db.execute(
        select(Participant).where(Participant.experiment_id == eid)
    )
    participants = result.scalars().all()

    group_dist: dict[str, int] = {}
    step_dist: dict[str, int] = {}
    completed = 0
    in_progress = 0

    for p in participants:
        g = p.group or "unassigned"
        group_dist[g] = group_dist.get(g, 0) + 1
        step_dist[p.current_step] = step_dist.get(p.current_step, 0) + 1
        if p.current_step == "completed":
            completed += 1
        elif p.current_step != "joined":
            in_progress += 1

    return ExperimentStats(
        total_participants=len(participants),
        completed=completed,
        in_progress=in_progress,
        group_distribution=group_dist,
        step_distribution=step_dist,
    )


@router.get(
    "/experiments/{experiment_id}/participants",
    response_model=list[ParticipantSummary],
)
async def list_participants(
    experiment_id: str,
    researcher: Researcher = Depends(get_current_researcher),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Participant)
        .where(Participant.experiment_id == experiment_id)
        .order_by(Participant.created_at.desc())
    )
    return [
        ParticipantSummary(
            id=str(p.id),
            nickname=p.nickname,
            group=p.group,
            current_step=p.current_step,
            bias_level=p.bias_level,
            created_at=p.created_at.isoformat(),
        )
        for p in result.scalars().all()
    ]


@router.get("/experiments/{experiment_id}/export/{data_type}")
async def export_data(
    experiment_id: str,
    data_type: str,
    researcher: Researcher = Depends(get_current_researcher),
    db: AsyncSession = Depends(get_db),
):
    eid = experiment_id
    if data_type == "trades":
        data = await export_trades_csv(eid, db)
        filename = "trades.csv"
    elif data_type == "questionnaires":
        data = await export_questionnaires_csv(eid, db)
        filename = "questionnaires.csv"
    elif data_type == "events":
        data = await export_events_csv(eid, db)
        filename = "events.csv"
    else:
        raise HTTPException(status_code=400, detail="无效的导出类型")

    return StreamingResponse(
        iter([data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
