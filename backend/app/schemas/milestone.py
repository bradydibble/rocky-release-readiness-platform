from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MilestoneCreate(BaseModel):
    name: str
    status: str = "open"
    start_date: datetime | None = None
    end_date: datetime | None = None
    download_url: str | None = None


class MilestoneUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    download_url: str | None = None


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    release_id: int
    name: str
    status: str
    start_date: datetime | None
    end_date: datetime | None
    download_url: str | None
    created_at: datetime
