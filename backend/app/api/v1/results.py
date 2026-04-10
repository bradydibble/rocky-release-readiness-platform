from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.models.result import Result
from app.models.section import Section
from app.models.test_case import TestCase
from app.schemas.result import ResultCreate, ResultResponse

router = APIRouter(tags=["results"])


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
):
    tc = await db.get(TestCase, test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    if body.outcome not in ("PASS", "FAIL", "PARTIAL", "SKIP"):
        raise HTTPException(status_code=422, detail="outcome must be PASS, FAIL, PARTIAL, or SKIP")

    submitter = body.submitter_name or x_username
    r = Result(
        test_case_id=test_case_id,
        outcome=body.outcome,
        arch=body.arch,
        deploy_type=body.deploy_type,
        hardware_notes=body.hardware_notes,
        submitter_name=submitter,
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
