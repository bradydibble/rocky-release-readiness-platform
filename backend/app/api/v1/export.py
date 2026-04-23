import json
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.models.milestone import Milestone
from app.models.result import Result
from app.models.section import Section
from app.models.test_case import TestCase

router = APIRouter(prefix="/milestones", tags=["export"])


def _slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("/", "-")


@router.get("/{milestone_id}/export/json")
async def export_json(milestone_id: int, db: AsyncSession = Depends(get_db)):
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
    m = (await db.execute(stmt)).scalar_one_or_none()
    if not m:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Milestone not found")

    data = {
        "milestone": {
            "id": m.id,
            "name": m.name,
            "status": m.status,
            "start_date": m.start_date.isoformat() if m.start_date else None,
            "end_date": m.end_date.isoformat() if m.end_date else None,
            "created_at": m.created_at.isoformat(),
            "release": {"id": m.release.id, "name": m.release.name, "version": m.release.version},
        },
        "sections": [],
    }

    for sec in m.sections:
        sec_data = {
            "id": sec.id,
            "name": sec.name,
            "architecture": sec.architecture,
            "test_cases": [],
        }
        for tc in sec.test_cases:
            tc_data = {
                "id": tc.id,
                "name": tc.name,
                "procedure_url": tc.procedure_url,
                "blocking": tc.blocking,
                "admin_signoff": tc.admin_signoff,
                "results": [
                    {
                        "id": r.id,
                        "outcome": r.outcome,
                        "arch": r.arch,
                        "deploy_type": r.deploy_type,
                        "submission_method": r.submission_method,
                        "quick_outcome": r.quick_outcome,
                        "hardware_notes": r.hardware_notes,
                        "comment": r.comment,
                        "bug_url": r.bug_url,
                        "submitter_name": r.submitter_name,
                        "submit_time": r.submit_time.isoformat(),
                        "carried_from_milestone_id": r.carried_from_milestone_id,
                    }
                    for r in tc.results
                ],
            }
            sec_data["test_cases"].append(tc_data)
        data["sections"].append(sec_data)

    slug = _slugify(f"{m.release.name}-{m.name}")
    filename = f"{slug}-results.json"
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{milestone_id}/export/markdown")
async def export_markdown(milestone_id: int, db: AsyncSession = Depends(get_db)):
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
    m = (await db.execute(stmt)).scalar_one_or_none()
    if not m:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Milestone not found")

    total_tc = sum(len(sec.test_cases) for sec in m.sections)
    total_results = sum(len(tc.results) for sec in m.sections for tc in sec.test_cases)
    tested_tc = sum(
        1 for sec in m.sections for tc in sec.test_cases if tc.results
    )

    lines = [
        f"# {m.release.name} {m.name} — Test Results",
        "",
        f"**Release:** {m.release.name} {m.release.version}  ",
        f"**Milestone:** {m.name}  ",
        f"**Status:** {m.status}  ",
    ]
    if m.start_date:
        lines.append(f"**Testing window:** {m.start_date.strftime('%Y-%m-%d')} – {m.end_date.strftime('%Y-%m-%d') if m.end_date else 'open'}  ")
    lines += [
        f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}  ",
        "",
        "## Summary",
        "",
        f"- Test cases: {total_tc}",
        f"- Tested: {tested_tc} / {total_tc}",
        f"- Results submitted: {total_results}",
        "",
    ]

    for sec in m.sections:
        arch_label = f" ({sec.architecture})" if sec.architecture else ""
        lines.append(f"## {sec.name}{arch_label}")
        lines.append("")
        lines.append("| Test Case | Blocking | Results | Signoff |")
        lines.append("|-----------|----------|---------|---------|")
        for tc in sec.test_cases:
            result_summary = ", ".join(
                f"{r.outcome} ({r.arch})" for r in tc.results
            ) or "—"
            signoff = "✓" if tc.admin_signoff else ""
            blocking = "🚫 Blocker" if tc.blocking == "blocker" else ""
            lines.append(f"| {tc.name} | {blocking} | {result_summary} | {signoff} |")
        lines.append("")

    slug = _slugify(f"{m.release.name}-{m.name}")
    filename = f"{slug}-results.md"
    return Response(
        content="\n".join(lines),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
