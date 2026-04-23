from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.milestone import Milestone
from app.models.result import Result
from app.models.section import Section
from app.models.test_case import TestCase
from app.models.user import User
from app.schemas.result import ResultCreate, ResultResponse

router = APIRouter(tags=["results"])

QUICK_OUTCOME_MAP = {"works": "PASS", "issues": "PARTIAL", "broken": "FAIL"}


@router.get("/milestones/{milestone_id}/results", response_model=list[ResultResponse])
async def list_results(milestone_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Result)
        .join(TestCase, TestCase.id == Result.test_case_id)
        .join(Section, Section.id == TestCase.section_id)
        .where(Section.milestone_id == milestone_id)
        .order_by(Result.submit_time.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/test-cases/{test_case_id}/results", response_model=list[ResultResponse])
async def list_test_case_results(test_case_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Result)
        .where(Result.test_case_id == test_case_id)
        .order_by(Result.submit_time.desc())
    )
    return result.scalars().all()


@router.post(
    "/test-cases/{test_case_id}/results",
    response_model=ResultResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_result(
    test_case_id: int,
    body: ResultCreate,
    db: AsyncSession = Depends(get_db),
    x_username: str | None = Header(default=None),
    current_user: User | None = Depends(get_current_user),
):
    tc = await db.get(TestCase, test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    # Enforce closed milestone
    section = await db.get(Section, tc.section_id)
    milestone = await db.get(Milestone, section.milestone_id)
    if milestone and milestone.status == "closed":
        raise HTTPException(status_code=409, detail="This milestone is closed and no longer accepting results")

    # Resolve outcome for quick submissions
    if body.submission_method == "quick":
        if body.quick_outcome not in QUICK_OUTCOME_MAP:
            raise HTTPException(status_code=422, detail="quick_outcome must be works, issues, or broken")
        outcome = QUICK_OUTCOME_MAP[body.quick_outcome]
    else:
        if body.outcome not in ("PASS", "FAIL", "PARTIAL", "SKIP"):
            raise HTTPException(status_code=422, detail="outcome must be PASS, FAIL, PARTIAL, or SKIP")
        outcome = body.outcome

    # Validate bug_url loosely
    if body.bug_url and not body.bug_url.startswith("http"):
        raise HTTPException(status_code=422, detail="bug_url must be a valid URL")

    submitter = body.submitter_name or x_username
    if current_user and not submitter:
        submitter = current_user.display_name
    r = Result(
        test_case_id=test_case_id,
        outcome=outcome,
        arch=body.arch,
        deploy_type=body.deploy_type,
        hardware_notes=body.hardware_notes,
        comment=body.comment,
        submitter_name=submitter,
        submission_method=body.submission_method,
        quick_outcome=body.quick_outcome,
        bug_url=body.bug_url,
        user_id=current_user.id if current_user else None,
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return r


@router.delete("/results/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_result(
    result_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Result).where(Result.id == result_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Result not found")
    await db.delete(r)
    await db.commit()
