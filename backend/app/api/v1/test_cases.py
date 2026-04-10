from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import require_admin
from app.models.section import Section
from app.models.test_case import TestCase
from app.schemas.test_case import TestCaseCreate, TestCaseResponse, TestCaseUpdate

router = APIRouter(tags=["test_cases"])


@router.get("/sections/{section_id}/test-cases", response_model=list[TestCaseResponse])
async def list_test_cases(section_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TestCase)
        .where(TestCase.section_id == section_id)
        .order_by(TestCase.sort_order)
    )
    return result.scalars().all()


@router.post(
    "/sections/{section_id}/test-cases",
    response_model=TestCaseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_test_case(
    section_id: int,
    body: TestCaseCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    sec = await db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    tc = TestCase(section_id=section_id, **body.model_dump())
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc


@router.patch("/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case(
    test_case_id: int,
    body: TestCaseUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(tc, k, v)
    await db.commit()
    await db.refresh(tc)
    return tc


@router.delete("/test-cases/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    await db.delete(tc)
    await db.commit()


@router.post("/test-cases/{test_case_id}/signoff", response_model=TestCaseResponse)
async def signoff_test_case(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
    x_username: str | None = Header(default=None),
):
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    tc.admin_signoff = True
    tc.signoff_by = x_username or "admin"
    tc.signoff_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(tc)
    return tc


@router.delete("/test-cases/{test_case_id}/signoff", response_model=TestCaseResponse)
async def remove_signoff(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    tc.admin_signoff = False
    tc.signoff_by = None
    tc.signoff_at = None
    await db.commit()
    await db.refresh(tc)
    return tc
