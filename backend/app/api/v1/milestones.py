from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import require_admin
from app.models.milestone import Milestone
from app.models.release import Release
from app.models.result import Result
from app.models.section import Section
from app.models.test_case import TestCase
from app.schemas.milestone import MilestoneCreate, MilestoneResponse, MilestoneUpdate
from app.schemas.result import CarryForwardRequest
from app.schemas.test_case import ResultCount, TestCaseWithCounts

router = APIRouter(prefix="/milestones", tags=["milestones"])


# ── nested response shapes ────────────────────────────────────────────────────

class SectionWithTestCases(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    milestone_id: int
    name: str
    architecture: str | None
    sort_order: int
    test_cases: list[TestCaseWithCounts] = []


class MilestoneDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    release_id: int
    name: str
    status: str
    created_at: datetime
    release_name: str
    release_version: str
    sections: list[SectionWithTestCases] = []


class CoverageCell(BaseModel):
    pass_count: int = 0
    fail_count: int = 0
    partial_count: int = 0
    skip_count: int = 0
    total: int = 0


class CoverageGrid(BaseModel):
    sections: list[dict] = []
    arches: list[str] = []
    grid: dict[str, CoverageCell] = {}


# ── helpers ───────────────────────────────────────────────────────────────────

async def _get_milestone_or_404(milestone_id: int, db: AsyncSession) -> Milestone:
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return m


async def _build_detail(milestone_id: int, db: AsyncSession) -> MilestoneDetail:
    stmt = (
        select(Milestone)
        .where(Milestone.id == milestone_id)
        .options(
            selectinload(Milestone.release),
            selectinload(Milestone.sections).selectinload(Section.test_cases).selectinload(
                TestCase.results
            ),
        )
    )
    result = await db.execute(stmt)
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")

    sections_out: list[SectionWithTestCases] = []
    for sec in m.sections:
        tc_out: list[TestCaseWithCounts] = []
        for tc in sec.test_cases:
            counts: dict[str, ResultCount] = defaultdict(ResultCount)
            for r in tc.results:
                c = counts[r.arch]
                if r.outcome == "PASS":
                    counts[r.arch] = ResultCount(
                        pass_count=c.pass_count + 1,
                        fail_count=c.fail_count,
                        partial_count=c.partial_count,
                        skip_count=c.skip_count,
                    )
                elif r.outcome == "FAIL":
                    counts[r.arch] = ResultCount(
                        pass_count=c.pass_count,
                        fail_count=c.fail_count + 1,
                        partial_count=c.partial_count,
                        skip_count=c.skip_count,
                    )
                elif r.outcome == "PARTIAL":
                    counts[r.arch] = ResultCount(
                        pass_count=c.pass_count,
                        fail_count=c.fail_count,
                        partial_count=c.partial_count + 1,
                        skip_count=c.skip_count,
                    )
                elif r.outcome == "SKIP":
                    counts[r.arch] = ResultCount(
                        pass_count=c.pass_count,
                        fail_count=c.fail_count,
                        partial_count=c.partial_count,
                        skip_count=c.skip_count + 1,
                    )
            tc_out.append(
                TestCaseWithCounts(
                    id=tc.id,
                    section_id=tc.section_id,
                    name=tc.name,
                    procedure_url=tc.procedure_url,
                    blocking=tc.blocking,
                    sort_order=tc.sort_order,
                    admin_signoff=tc.admin_signoff,
                    signoff_by=tc.signoff_by,
                    signoff_at=tc.signoff_at,
                    counts_by_arch=dict(counts),
                )
            )
        sections_out.append(
            SectionWithTestCases(
                id=sec.id,
                milestone_id=sec.milestone_id,
                name=sec.name,
                architecture=sec.architecture,
                sort_order=sec.sort_order,
                test_cases=tc_out,
            )
        )

    return MilestoneDetail(
        id=m.id,
        release_id=m.release_id,
        name=m.name,
        status=m.status,
        created_at=m.created_at,
        release_name=m.release.name,
        release_version=m.release.version,
        sections=sections_out,
    )


# ── routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/releases/{release_id}",
    response_model=MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["releases"],
)
async def create_milestone(
    release_id: int,
    body: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    rel = await db.get(Release, release_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Release not found")
    m = Milestone(release_id=release_id, **body.model_dump())
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@router.get("/{milestone_id}", response_model=MilestoneDetail)
async def get_milestone(milestone_id: int, db: AsyncSession = Depends(get_db)):
    return await _build_detail(milestone_id, db)


@router.patch("/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    milestone_id: int,
    body: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    m = await _get_milestone_or_404(milestone_id, db)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(m, k, v)
    await db.commit()
    await db.refresh(m)
    return m


@router.delete("/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    m = await _get_milestone_or_404(milestone_id, db)
    await db.delete(m)
    await db.commit()


@router.get("/{milestone_id}/coverage", response_model=CoverageGrid)
async def get_coverage(milestone_id: int, db: AsyncSession = Depends(get_db)):
    detail = await _build_detail(milestone_id, db)

    arches_set: set[str] = set()
    for sec in detail.sections:
        for tc in sec.test_cases:
            arches_set.update(tc.counts_by_arch.keys())
    arches = sorted(arches_set)

    grid: dict[str, CoverageCell] = {}
    for sec in detail.sections:
        for arch in arches:
            cell = CoverageCell()
            for tc in sec.test_cases:
                c = tc.counts_by_arch.get(arch)
                if c:
                    cell.pass_count += c.pass_count
                    cell.fail_count += c.fail_count
                    cell.partial_count += c.partial_count
                    cell.skip_count += c.skip_count
                    cell.total += c.pass_count + c.fail_count + c.partial_count + c.skip_count
            grid[f"{sec.id}_{arch}"] = cell

    sections_meta = [
        {"id": s.id, "name": s.name, "architecture": s.architecture}
        for s in detail.sections
    ]
    return CoverageGrid(sections=sections_meta, arches=arches, grid=grid)


@router.post(
    "/{milestone_id}/carry-forward",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
async def carry_forward(
    milestone_id: int,
    body: CarryForwardRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Copy results from source_milestone into the target milestone's test cases.

    Matching is by section name + test case name (not ID) so test cases survive
    milestone copy-paste.
    """
    await _get_milestone_or_404(milestone_id, db)
    await _get_milestone_or_404(body.source_milestone_id, db)

    # Load target test cases (section_name, tc_name) → tc_id
    target_stmt = (
        select(TestCase, Section)
        .join(Section, Section.id == TestCase.section_id)
        .where(Section.milestone_id == milestone_id)
    )
    target_rows = (await db.execute(target_stmt)).all()
    target_map: dict[tuple[str, str], int] = {
        (row.Section.name, row.TestCase.name): row.TestCase.id for row in target_rows
    }

    # Load source results
    source_stmt = (
        select(Result, TestCase, Section)
        .join(TestCase, TestCase.id == Result.test_case_id)
        .join(Section, Section.id == TestCase.section_id)
        .where(Section.milestone_id == body.source_milestone_id)
    )
    source_rows = (await db.execute(source_stmt)).all()

    copied = 0
    for row in source_rows:
        key = (row.Section.name, row.TestCase.name)
        target_tc_id = target_map.get(key)
        if not target_tc_id:
            continue
        new_result = Result(
            test_case_id=target_tc_id,
            outcome=row.Result.outcome,
            arch=row.Result.arch,
            deploy_type=row.Result.deploy_type,
            hardware_notes=row.Result.hardware_notes,
            submitter_name=row.Result.submitter_name,
            carried_from_milestone_id=body.source_milestone_id,
        )
        db.add(new_result)
        copied += 1

    await db.commit()
    return {"copied": copied, "source_milestone_id": body.source_milestone_id}
