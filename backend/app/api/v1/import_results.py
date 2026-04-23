from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.milestone import Milestone
from app.models.result import Result
from app.models.section import Section
from app.models.test_case import TestCase

router = APIRouter(prefix="/milestones", tags=["milestones"])

VALID_OUTCOMES = {"PASS", "FAIL", "PARTIAL", "SKIP"}


class BulkResultItem(BaseModel):
    section_name: str
    test_case_name: str
    outcome: str
    comment: str | None = None


class BulkImportRequest(BaseModel):
    submitter_name: str | None = None
    arch: str
    deploy_type: str = "bare-metal"
    hardware_notes: str | None = None
    results: list[BulkResultItem]


class BulkImportResponse(BaseModel):
    imported: int
    skipped: int
    unmatched: list[str]


@router.post(
    "/{milestone_id}/bulk-import",
    response_model=BulkImportResponse,
    status_code=status.HTTP_200_OK,
)
async def bulk_import(
    milestone_id: int,
    body: BulkImportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Import multiple results matched by (section_name, test_case_name).

    No auth required — result submission is open to all community members.
    Returns counts of imported, skipped (invalid outcome), and unmatched entries.
    """
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if milestone.status != "open":
        raise HTTPException(status_code=409, detail="Milestone is closed")

    # Load all test cases with their section info
    stmt = (
        select(TestCase, Section)
        .join(Section, Section.id == TestCase.section_id)
        .where(Section.milestone_id == milestone_id)
    )
    rows = (await db.execute(stmt)).all()

    # Build lookup maps for exact and partial matching
    exact_map: dict[tuple[str, str], TestCase] = {}
    for row in rows:
        key = (row.Section.name.lower().strip(), row.TestCase.name.lower().strip())
        exact_map[key] = row.TestCase

    imported = 0
    skipped = 0
    unmatched: list[str] = []

    for item in body.results:
        outcome = item.outcome.upper()
        if outcome not in VALID_OUTCOMES:
            skipped += 1
            continue

        # Try exact match first
        key = (item.section_name.lower().strip(), item.test_case_name.lower().strip())
        tc = exact_map.get(key)

        # Fall back to partial match: item pattern contained in stored name
        if tc is None:
            item_sec = item.section_name.lower().strip()
            item_tc = item.test_case_name.lower().strip()
            for (sec_name, tc_name), test_case in exact_map.items():
                if item_sec in sec_name and item_tc in tc_name:
                    tc = test_case
                    break

        if tc is None:
            unmatched.append(f"{item.section_name} / {item.test_case_name}")
            continue

        new_result = Result(
            test_case_id=tc.id,
            outcome=outcome,
            arch=body.arch,
            deploy_type=body.deploy_type,
            hardware_notes=body.hardware_notes,
            comment=item.comment,
            submitter_name=body.submitter_name,
            submission_method="bulk",
        )
        db.add(new_result)
        imported += 1

    await db.commit()
    return BulkImportResponse(imported=imported, skipped=skipped, unmatched=unmatched)
