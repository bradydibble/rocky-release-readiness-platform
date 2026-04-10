from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResultCreate(BaseModel):
    outcome: str  # PASS / FAIL / PARTIAL / SKIP
    arch: str
    deploy_type: str
    hardware_notes: str | None = None
    comment: str | None = None
    submitter_name: str | None = None


class ResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    test_case_id: int
    outcome: str
    arch: str
    deploy_type: str
    hardware_notes: str | None
    comment: str | None
    submitter_name: str | None
    submit_time: datetime
    carried_from_milestone_id: int | None


class CarryForwardRequest(BaseModel):
    source_milestone_id: int
