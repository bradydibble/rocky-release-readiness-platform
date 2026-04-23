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
    start_date: datetime | None
    end_date: datetime | None
    created_at: datetime
    test_case_count: int = 0
    result_count: int = 0


class ReleaseDetail(ReleaseResponse):
    milestones: list[MilestoneStub] = []
