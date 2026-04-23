from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import require_admin
from app.models.milestone import Milestone
from app.models.release import Release
from app.models.result import Result
from app.models.section import Section
from app.models.test_case import TestCase
from app.schemas.release import MilestoneStub, ReleaseCreate, ReleaseDetail, ReleaseResponse, ReleaseUpdate

router = APIRouter(prefix="/releases", tags=["releases"])


async def _milestone_counts(milestone_ids: list[int], db: AsyncSession) -> dict[int, dict]:
    """Return {milestone_id: {test_case_count, result_count}} for a list of milestone IDs."""
    if not milestone_ids:
        return {}

    tc_stmt = (
        select(Section.milestone_id, func.count(TestCase.id).label("tc_count"))
        .join(TestCase, TestCase.section_id == Section.id)
        .where(Section.milestone_id.in_(milestone_ids))
        .group_by(Section.milestone_id)
    )
    tc_rows = (await db.execute(tc_stmt)).all()
    tc_map = {row.milestone_id: row.tc_count for row in tc_rows}

    result_stmt = (
        select(Section.milestone_id, func.count(Result.id).label("r_count"))
        .join(TestCase, TestCase.section_id == Section.id)
        .join(Result, Result.test_case_id == TestCase.id)
        .where(Section.milestone_id.in_(milestone_ids))
        .group_by(Section.milestone_id)
    )
    result_rows = (await db.execute(result_stmt)).all()
    r_map = {row.milestone_id: row.r_count for row in result_rows}

    return {
        mid: {"test_case_count": tc_map.get(mid, 0), "result_count": r_map.get(mid, 0)}
        for mid in milestone_ids
    }


def _build_milestone_stubs(milestones: list[Milestone], counts: dict[int, dict]) -> list[MilestoneStub]:
    stubs = []
    for m in milestones:
        c = counts.get(m.id, {})
        stubs.append(MilestoneStub(
            id=m.id,
            name=m.name,
            status=m.status,
            start_date=m.start_date,
            end_date=m.end_date,
            created_at=m.created_at,
            test_case_count=c.get("test_case_count", 0),
            result_count=c.get("result_count", 0),
        ))
    return stubs


@router.get("", response_model=list[ReleaseDetail])
async def list_releases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Release)
        .options(selectinload(Release.milestones))
        .order_by(Release.created_at.desc())
    )
    releases = result.scalars().all()

    all_milestone_ids = [m.id for r in releases for m in r.milestones]
    counts = await _milestone_counts(all_milestone_ids, db)

    out = []
    for rel in releases:
        stubs = _build_milestone_stubs(rel.milestones, counts)
        out.append(ReleaseDetail(
            id=rel.id,
            name=rel.name,
            version=rel.version,
            notes=rel.notes,
            created_at=rel.created_at,
            milestones=stubs,
        ))
    return out


@router.post("", response_model=ReleaseResponse, status_code=status.HTTP_201_CREATED)
async def create_release(
    body: ReleaseCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    release = Release(**body.model_dump())
    db.add(release)
    await db.commit()
    await db.refresh(release)
    return release


@router.get("/{release_id}", response_model=ReleaseDetail)
async def get_release(release_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Release)
        .where(Release.id == release_id)
        .options(selectinload(Release.milestones))
    )
    release = result.scalar_one_or_none()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")

    milestone_ids = [m.id for m in release.milestones]
    counts = await _milestone_counts(milestone_ids, db)
    stubs = _build_milestone_stubs(release.milestones, counts)

    return ReleaseDetail(
        id=release.id,
        name=release.name,
        version=release.version,
        notes=release.notes,
        created_at=release.created_at,
        milestones=stubs,
    )


@router.patch("/{release_id}", response_model=ReleaseResponse)
async def update_release(
    release_id: int,
    body: ReleaseUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Release).where(Release.id == release_id))
    release = result.scalar_one_or_none()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(release, k, v)
    await db.commit()
    await db.refresh(release)
    return release


@router.delete("/{release_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_release(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(Release).where(Release.id == release_id))
    release = result.scalar_one_or_none()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    await db.delete(release)
    await db.commit()
