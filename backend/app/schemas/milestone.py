from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MilestoneCreate(BaseModel):
    name: str
    status: str = "open"


class MilestoneUpdate(BaseModel):
    name: str | None = None
    status: str | None = None


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    release_id: int
    name: str
    status: str
    created_at: datetime
