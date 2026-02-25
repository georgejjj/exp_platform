from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_participant
from app.database import get_db
from app.models.event_log import EventLog
from app.models.participant import Participant
from app.schemas.events import BatchEventRequest, BatchEventResponse

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("/batch", response_model=BatchEventResponse)
async def batch_log_events(
    req: BatchEventRequest,
    participant: Participant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db),
):
    for event in req.events:
        client_ts = None
        if event.client_timestamp:
            try:
                client_ts = datetime.fromisoformat(event.client_timestamp)
            except (ValueError, TypeError):
                pass

        log = EventLog(
            participant_id=participant.id,
            event_type=event.event_type,
            page=event.page,
            data=event.data,
            client_timestamp=client_ts,
        )
        db.add(log)

    await db.commit()
    return BatchEventResponse(logged=len(req.events))
