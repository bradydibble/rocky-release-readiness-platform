from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
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
    start_date: datetime | None
    end_date: datetime | None
    download_url: str | None
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
        start_date=m.start_date,
        end_date=m.end_date,
        download_url=m.download_url,
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


class UrgentNeed(BaseModel):
    section_name: str
    test_case_id: int
    test_case_name: str
    blocking: str


@router.get("/{milestone_id}/urgent-needs", response_model=list[UrgentNeed])
async def get_urgent_needs(milestone_id: int, db: AsyncSession = Depends(get_db)):
    """Return blocker test cases with zero results across all arches."""
    await _get_milestone_or_404(milestone_id, db)

    stmt = (
        select(TestCase, Section)
        .join(Section, Section.id == TestCase.section_id)
        .where(Section.milestone_id == milestone_id)
        .where(TestCase.blocking == "blocker")
        .order_by(Section.sort_order, TestCase.sort_order)
    )
    rows = (await db.execute(stmt)).all()

    needs: list[UrgentNeed] = []
    for row in rows:
        result_count = await db.execute(
            select(Result).where(Result.test_case_id == row.TestCase.id).limit(1)
        )
        if result_count.scalar_one_or_none() is None:
            needs.append(UrgentNeed(
                section_name=row.Section.name,
                test_case_id=row.TestCase.id,
                test_case_name=row.TestCase.name,
                blocking=row.TestCase.blocking,
            ))
        if len(needs) >= 10:
            break

    return needs


class CategorySectionSummary(BaseModel):
    section_id: int
    name: str
    arch: str | None
    total: int
    covered: int


class ArchSummary(BaseModel):
    total: int
    covered: int
    confidence: str = "none"  # none | low | medium | high


class CategorySummary(BaseModel):
    category: str
    label: str
    total: int
    covered: int
    by_arch: dict[str, ArchSummary] = {}
    sections: list[CategorySectionSummary] = []


class CoverageSummaryResponse(BaseModel):
    total_tests: int
    total_with_results: int
    categories: list[CategorySummary] = []
    by_arch: dict[str, ArchSummary] = {}
    hardware_configs: int


CATEGORY_LABELS = {
    "installer": "Installers",
    "cloud": "Cloud Images",
    "post_install": "Post-Install Checks",
    "repository": "Repository Checks",
    "virtualization": "Virtualization",
    "guest_compat": "Guest Compatibility",
    "upgrade": "Upgrade Paths",
    "security": "Security & Compliance",
    "hardware": "Hardware / SIG",
    "operations": "Operations",
    "release_gate": "Release Gate",
}


@router.get("/{milestone_id}/coverage-summary", response_model=CoverageSummaryResponse)
async def get_coverage_summary(milestone_id: int, db: AsyncSession = Depends(get_db)):
    """Return coverage aggregated by section category for the dashboard."""
    detail = await _build_detail(milestone_id, db)

    # Count unique hardware configs
    hw_stmt = (
        select(func.count())
        .select_from(
            select(Result.arch, Result.deploy_type, Result.hardware_notes)
            .join(TestCase, TestCase.id == Result.test_case_id)
            .join(Section, Section.id == TestCase.section_id)
            .where(Section.milestone_id == milestone_id)
            .where(Result.hardware_notes.isnot(None))
            .where(Result.hardware_notes != "")
            .group_by(Result.arch, Result.deploy_type, Result.hardware_notes)
            .subquery()
        )
    )
    hw_count = (await db.execute(hw_stmt)).scalar() or 0

    # Build a map of section_id → category from the DB
    sec_stmt = select(Section.id, Section.category).where(Section.milestone_id == milestone_id)
    sec_rows = (await db.execute(sec_stmt)).all()
    sec_category_map: dict[int, str | None] = {r.id: r.category for r in sec_rows}

    # Collect all arches that have results
    all_arches: set[str] = set()
    for sec in detail.sections:
        for tc in sec.test_cases:
            all_arches.update(tc.counts_by_arch.keys())
    # Also include arches from section architecture field
    for sec in detail.sections:
        if sec.architecture:
            all_arches.add(sec.architecture)

    # Aggregate
    total_tests = 0
    total_with_results = 0
    by_arch: dict[str, ArchSummary] = {}
    categories_map: dict[str, CategorySummary] = {}
    # Track per-category per-arch: {cat: {arch: {total: N, covered: N}}}
    cat_arch_data: dict[str, dict[str, dict[str, int]]] = {}

    for sec in detail.sections:
        cat = sec_category_map.get(sec.id) or "other"
        if cat not in categories_map:
            categories_map[cat] = CategorySummary(
                category=cat,
                label=CATEGORY_LABELS.get(cat, cat.replace("_", " ").title()),
                total=0,
                covered=0,
                sections=[],
            )
            cat_arch_data[cat] = {}

        # Determine which arches this section applies to
        sec_arches = [sec.architecture] if sec.architecture else sorted(all_arches)

        sec_total = len(sec.test_cases)
        sec_covered = 0

        for tc in sec.test_cases:
            total_tests += 1
            has_result = any(
                (c.pass_count + c.fail_count + c.partial_count + c.skip_count) > 0
                for c in tc.counts_by_arch.values()
            )
            if has_result:
                total_with_results += 1
                sec_covered += 1

            # Per-architecture tracking (global)
            for arch_name, counts in tc.counts_by_arch.items():
                arch_total_results = counts.pass_count + counts.fail_count + counts.partial_count + counts.skip_count
                if arch_name not in by_arch:
                    by_arch[arch_name] = ArchSummary(total=0, covered=0)
                by_arch[arch_name].total += 1
                if arch_total_results > 0:
                    by_arch[arch_name].covered += 1

            # Per-category per-arch tracking
            for arch_name in sec_arches:
                if arch_name not in cat_arch_data[cat]:
                    cat_arch_data[cat][arch_name] = {"total": 0, "covered": 0}
                cat_arch_data[cat][arch_name]["total"] += 1
                # Check if this test has results for this specific arch
                c = tc.counts_by_arch.get(arch_name)
                if c and (c.pass_count + c.fail_count + c.partial_count + c.skip_count) > 0:
                    cat_arch_data[cat][arch_name]["covered"] += 1

        categories_map[cat].total += sec_total
        categories_map[cat].covered += sec_covered
        categories_map[cat].sections.append(
            CategorySectionSummary(
                section_id=sec.id,
                name=sec.name,
                arch=sec.architecture,
                total=sec_total,
                covered=sec_covered,
            )
        )

    # Attach per-arch data to each category
    for cat, cat_summary in categories_map.items():
        arch_data = cat_arch_data.get(cat, {})
        cat_summary.by_arch = {
            arch: ArchSummary(total=d["total"], covered=d["covered"])
            for arch, d in arch_data.items()
        }

    # ── Confidence scoring ─────────────────────────────────────────────────
    # Query results with user info to compute reputation-weighted confidence
    # per (category, arch) cell.
    from app.models.user import User

    conf_stmt = (
        select(
            Section.category,
            Result.arch,
            Result.test_case_id,
            Result.user_id,
            User.is_test_team,
            Result.deploy_type,
            Result.hardware_notes,
        )
        .select_from(Result)
        .join(TestCase, TestCase.id == Result.test_case_id)
        .join(Section, Section.id == TestCase.section_id)
        .outerjoin(User, User.id == Result.user_id)
        .where(Section.milestone_id == milestone_id)
    )
    conf_rows = (await db.execute(conf_stmt)).all()

    # Aggregate: {(category, arch): total_weight}
    cell_weights: dict[tuple[str, str], float] = {}
    cell_hw: dict[tuple[str, str], set[str]] = {}
    for row in conf_rows:
        cat = row.category or "other"
        arch = row.arch
        key = (cat, arch)
        # Weight: anonymous=1, logged-in tester=2, test team=3
        if row.user_id is None:
            weight = 1
        elif row.is_test_team:
            weight = 3
        else:
            weight = 2
        cell_weights[key] = cell_weights.get(key, 0) + weight
        # Track unique hardware configs for multiplier
        if key not in cell_hw:
            cell_hw[key] = set()
        hw_key = f"{row.deploy_type}|{row.hardware_notes or ''}"
        cell_hw[key].add(hw_key)

    def _confidence(key: tuple[str, str]) -> str:
        w = cell_weights.get(key, 0)
        if w == 0:
            return "none"
        # Bonus for hardware diversity
        hw_count_cell = len(cell_hw.get(key, set()))
        if hw_count_cell >= 3:
            w *= 1.5
        if w >= 6:
            return "high"
        if w >= 3:
            return "medium"
        return "low"

    # Apply confidence to category-level arch summaries
    for cat, cat_summary in categories_map.items():
        for arch_name, arch_sum in cat_summary.by_arch.items():
            arch_sum.confidence = _confidence((cat, arch_name))

    # Apply confidence to global arch summaries
    for arch_name, arch_sum in by_arch.items():
        # Global confidence: sum across all categories for this arch
        total_w = sum(cell_weights.get((c, arch_name), 0) for c in categories_map)
        if total_w >= 6:
            arch_sum.confidence = "high"
        elif total_w >= 3:
            arch_sum.confidence = "medium"
        elif total_w > 0:
            arch_sum.confidence = "low"

    # Sort categories by the order in CATEGORY_LABELS
    cat_order = list(CATEGORY_LABELS.keys())
    categories = sorted(
        categories_map.values(),
        key=lambda c: cat_order.index(c.category) if c.category in cat_order else 999,
    )

    return CoverageSummaryResponse(
        total_tests=total_tests,
        total_with_results=total_with_results,
        categories=categories,
        by_arch=by_arch,
        hardware_configs=hw_count,
    )


class HardwareEntry(BaseModel):
    arch: str
    deploy_type: str
    hardware_notes: str
    result_count: int


@router.get("/{milestone_id}/hardware-coverage", response_model=list[HardwareEntry])
async def get_hardware_coverage(milestone_id: int, db: AsyncSession = Depends(get_db)):
    """Return unique (arch, deploy_type, hardware_notes) combinations with result counts."""
    await _get_milestone_or_404(milestone_id, db)

    stmt = (
        select(
            Result.arch,
            Result.deploy_type,
            Result.hardware_notes,
            func.count(Result.id).label("result_count"),
        )
        .join(TestCase, TestCase.id == Result.test_case_id)
        .join(Section, Section.id == TestCase.section_id)
        .where(Section.milestone_id == milestone_id)
        .where(Result.hardware_notes.isnot(None))
        .where(Result.hardware_notes != "")
        .group_by(Result.arch, Result.deploy_type, Result.hardware_notes)
        .order_by(Result.arch, func.count(Result.id).desc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        HardwareEntry(
            arch=row.arch,
            deploy_type=row.deploy_type,
            hardware_notes=row.hardware_notes,
            result_count=row.result_count,
        )
        for row in rows
    ]


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
            comment=row.Result.comment,
            submitter_name=row.Result.submitter_name,
            submission_method=row.Result.submission_method,
            quick_outcome=row.Result.quick_outcome,
            bug_url=row.Result.bug_url,
            carried_from_milestone_id=body.source_milestone_id,
        )
        db.add(new_result)
        copied += 1

    await db.commit()
    return {"copied": copied, "source_milestone_id": body.source_milestone_id}


# ── milestone reset ──────────────────────────────────────────────────────────


@router.post("/{milestone_id}/reset")
async def reset_milestone(
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Clear all admin_signoff flags on test cases for this milestone.

    Results are preserved — only the approval status is reset.
    Use this when a new release candidate lands and tests need re-approval.
    """
    ms = await db.get(Milestone, milestone_id)
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")

    stmt = (
        select(TestCase)
        .join(Section, Section.id == TestCase.section_id)
        .where(Section.milestone_id == milestone_id, TestCase.admin_signoff == True)  # noqa: E712
    )
    rows = (await db.execute(stmt)).scalars().all()
    count = 0
    for tc in rows:
        tc.admin_signoff = False
        tc.signoff_by = None
        tc.signoff_at = None
        count += 1

    await db.commit()
    return {"reset": count, "milestone_id": milestone_id}
