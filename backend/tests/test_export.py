import json
import pytest


async def _setup_milestone_with_result(admin_client):
    """Return a milestone_id that has one section, one test case, and one result."""
    rel = (await admin_client.post(
        "/api/v1/releases", json={"name": "Rocky Linux", "version": "9.8"}
    )).json()
    ms = (await admin_client.post(
        f"/api/v1/milestones/releases/{rel['id']}",
        json={"name": "beta", "status": "open",
              "start_date": "2026-04-10T00:00:00",
              "end_date": "2026-04-24T00:00:00"},
    )).json()
    sec = (await admin_client.post(
        f"/api/v1/milestones/{ms['id']}/sections",
        json={"name": "Post-Installation Requirements", "architecture": "x86_64"},
    )).json()
    tc = (await admin_client.post(
        f"/api/v1/sections/{sec['id']}/test-cases",
        json={"name": "SELinux enforcing", "blocking": "blocker"},
    )).json()
    await admin_client.post(
        f"/api/v1/test-cases/{tc['id']}/results",
        json={
            "outcome": "PASS",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "submitter_name": "tester1",
            "bug_url": None,
        },
    )
    return ms["id"], rel, ms, sec, tc


# ── JSON export ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_export_json_status(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/json")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_export_json_content_disposition(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/json")
    cd = resp.headers.get("content-disposition", "")
    assert "attachment" in cd
    assert ".json" in cd


@pytest.mark.asyncio
async def test_export_json_structure(admin_client):
    ms_id, rel, ms, sec, tc = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/json")
    data = resp.json()

    assert "milestone" in data
    assert "sections" in data

    m = data["milestone"]
    assert m["id"] == ms_id
    assert m["name"] == "beta"
    assert m["status"] == "open"
    assert m["start_date"] is not None
    assert m["end_date"] is not None
    assert m["release"]["version"] == "9.8"

    assert len(data["sections"]) == 1
    s = data["sections"][0]
    assert s["name"] == "Post-Installation Requirements"
    assert s["architecture"] == "x86_64"
    assert len(s["test_cases"]) == 1

    t = s["test_cases"][0]
    assert t["name"] == "SELinux enforcing"
    assert t["blocking"] == "blocker"
    assert len(t["results"]) == 1

    r = t["results"][0]
    assert r["outcome"] == "PASS"
    assert r["arch"] == "x86_64"
    assert r["submitter_name"] == "tester1"


@pytest.mark.asyncio
async def test_export_json_empty_milestone(admin_client, milestone):
    resp = await admin_client.get(f"/api/v1/milestones/{milestone['id']}/export/json")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sections"] == []


@pytest.mark.asyncio
async def test_export_json_not_found(admin_client):
    resp = await admin_client.get("/api/v1/milestones/9999/export/json")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_export_json_is_valid_json(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/json")
    # Should parse without error
    parsed = json.loads(resp.content)
    assert isinstance(parsed, dict)


# ── Markdown export ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_export_markdown_status(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/markdown")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_export_markdown_content_disposition(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/markdown")
    cd = resp.headers.get("content-disposition", "")
    assert "attachment" in cd
    assert ".md" in cd


@pytest.mark.asyncio
async def test_export_markdown_contains_release_info(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/markdown")
    body = resp.text
    assert "Rocky Linux" in body
    assert "9.8" in body
    assert "beta" in body


@pytest.mark.asyncio
async def test_export_markdown_contains_summary(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/markdown")
    body = resp.text
    assert "## Summary" in body
    assert "Test cases:" in body
    assert "Tested:" in body
    assert "Results submitted:" in body


@pytest.mark.asyncio
async def test_export_markdown_contains_section(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/markdown")
    body = resp.text
    assert "Post-Installation Requirements" in body
    assert "SELinux enforcing" in body
    assert "PASS" in body


@pytest.mark.asyncio
async def test_export_markdown_blocker_label(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/markdown")
    body = resp.text
    assert "Blocker" in body


@pytest.mark.asyncio
async def test_export_markdown_date_range(admin_client):
    ms_id, *_ = await _setup_milestone_with_result(admin_client)
    resp = await admin_client.get(f"/api/v1/milestones/{ms_id}/export/markdown")
    body = resp.text
    assert "2026-04-10" in body
    assert "2026-04-24" in body


@pytest.mark.asyncio
async def test_export_markdown_not_found(admin_client):
    resp = await admin_client.get("/api/v1/milestones/9999/export/markdown")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_export_markdown_untested_shows_dash(admin_client, milestone, test_case):
    """Test cases with no results should show — in the results column."""
    resp = await admin_client.get(f"/api/v1/milestones/{milestone['id']}/export/markdown")
    body = resp.text
    assert "—" in body


@pytest.mark.asyncio
async def test_export_markdown_signoff_shown(admin_client, milestone, test_case):
    await admin_client.post(
        f"/api/v1/test-cases/{test_case['id']}/signoff",
        headers={"X-Username": "release-lead"},
    )
    resp = await admin_client.get(f"/api/v1/milestones/{milestone['id']}/export/markdown")
    body = resp.text
    assert "✓" in body
