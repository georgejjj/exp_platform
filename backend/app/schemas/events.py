from pydantic import BaseModel


class EventItem(BaseModel):
    event_type: str
    page: str | None = None
    data: dict | None = None
    client_timestamp: str | None = None


class BatchEventRequest(BaseModel):
    events: list[EventItem]


class BatchEventResponse(BaseModel):
    logged: int
