from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReleaseCreate(BaseModel):
    name: str
    version: str
    notes: str | None = None


class ReleaseUpdate(BaseModel):
    name: str | None = None
    version: str | None = None
    notes: str | None = None


class ReleaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    version: str
    notes: str | None
    created_at: datetime


class MilestoneStub(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: str
    created_at: datetime


class ReleaseDetail(ReleaseResponse):
    milestones: list[MilestoneStub] = []
