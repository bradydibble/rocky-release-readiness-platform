from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import require_admin
from app.models.release import Release
from app.schemas.release import ReleaseCreate, ReleaseDetail, ReleaseResponse, ReleaseUpdate

router = APIRouter(prefix="/releases", tags=["releases"])


@router.get("", response_model=list[ReleaseDetail])
async def list_releases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Release)
        .options(selectinload(Release.milestones))
        .order_by(Release.created_at.desc())
    )
    return result.scalars().all()


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
    return release


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
