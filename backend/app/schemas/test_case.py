from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TestCaseCreate(BaseModel):
    name: str
    procedure_url: str | None = None
    blocking: str = "normal"
    sort_order: int = 0


class TestCaseUpdate(BaseModel):
    name: str | None = None
    procedure_url: str | None = None
    blocking: str | None = None
    sort_order: int | None = None


class ResultCount(BaseModel):
    pass_count: int = 0
    fail_count: int = 0
    partial_count: int = 0
    skip_count: int = 0


class TestCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    section_id: int
    name: str
    procedure_url: str | None
    blocking: str
    sort_order: int
    admin_signoff: bool
    signoff_by: str | None
    signoff_at: datetime | None


class TestCaseWithCounts(TestCaseResponse):
    counts_by_arch: dict[str, ResultCount] = {}
