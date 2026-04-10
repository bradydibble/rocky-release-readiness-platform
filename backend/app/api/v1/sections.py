from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import require_admin
from app.models.milestone import Milestone
from app.models.section import Section
from app.schemas.section import SectionCreate, SectionResponse, SectionUpdate

router = APIRouter(tags=["sections"])


@router.get("/milestones/{milestone_id}/sections", response_model=list[SectionResponse])
async def list_sections(milestone_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Section)
        .where(Section.milestone_id == milestone_id)
        .order_by(Section.sort_order)
    )
    return result.scalars().all()


@router.post(
    "/milestones/{milestone_id}/sections",
    response_model=SectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_section(
    milestone_id: int,
    body: SectionCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    m = await db.get(Milestone, milestone_id)
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    sec = Section(milestone_id=milestone_id, **body.model_dump())
    db.add(sec)
    await db.commit()
    await db.refresh(sec)
    return sec


@router.patch("/sections/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: int,
    body: SectionUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Section).where(Section.id == section_id))
    sec = result.scalar_one_or_none()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(sec, k, v)
    await db.commit()
    await db.refresh(sec)
    return sec


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Section).where(Section.id == section_id))
    sec = result.scalar_one_or_none()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    await db.delete(sec)
    await db.commit()
