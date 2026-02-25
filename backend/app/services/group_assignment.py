import random

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.participant import Participant

GROUPS = ["control", "feedback", "guidance", "feedback_guidance"]


async def assign_group(experiment_id, db: AsyncSession, method: str = "balanced_random") -> str:
    if method == "sequential":
        result = await db.execute(
            select(func.count()).where(Participant.experiment_id == experiment_id)
        )
        count = result.scalar() or 0
        return GROUPS[count % len(GROUPS)]

    # balanced_random: assign to group with fewest members
    counts = {}
    for g in GROUPS:
        result = await db.execute(
            select(func.count()).where(
                Participant.experiment_id == experiment_id,
                Participant.group == g,
            )
        )
        counts[g] = result.scalar() or 0

    min_count = min(counts.values())
    candidates = [g for g, c in counts.items() if c == min_count]
    return random.choice(candidates)
