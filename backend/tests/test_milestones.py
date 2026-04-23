import pytest


@pytest.mark.asyncio
async def test_create_milestone(admin_client, release):
    resp = await admin_client.post(
        f"/api/v1/milestones/releases/{release['id']}",
        json={"name": "beta", "status": "open"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "beta"
    assert data["status"] == "open"
    assert data["release_id"] == release["id"]


@pytest.mark.asyncio
async def test_create_milestone_with_dates(admin_client, release):
    resp = await admin_client.post(
        f"/api/v1/milestones/releases/{release['id']}",
        json={
            "name": "rc1",
            "status": "open",
            "start_date": "2026-04-10T00:00:00",
            "end_date": "2026-04-24T00:00:00",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["start_date"] is not None
    assert data["end_date"] is not None


@pytest.mark.asyncio
async def test_create_milestone_requires_admin(client, release):
    resp = await client.post(
        f"/api/v1/milestones/releases/{release['id']}",
        json={"name": "beta", "status": "open"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_milestone_release_not_found(admin_client):
    resp = await admin_client.post(
        "/api/v1/milestones/releases/9999",
        json={"name": "beta", "status": "open"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_milestone(client, milestone):
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == milestone["id"]
    assert data["name"] == "beta"
    assert "sections" in data
    assert "release_name" in data
    assert "release_version" in data


@pytest.mark.asyncio
async def test_get_milestone_not_found(client):
    resp = await client.get("/api/v1/milestones/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_patch_milestone_status(admin_client, milestone):
    resp = await admin_client.patch(
        f"/api/v1/milestones/{milestone['id']}",
        json={"status": "closed"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "closed"


@pytest.mark.asyncio
async def test_patch_milestone_requires_admin(client, milestone):
    resp = await client.patch(
        f"/api/v1/milestones/{milestone['id']}",
        json={"status": "closed"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_milestone(admin_client, milestone):
    resp = await admin_client.delete(f"/api/v1/milestones/{milestone['id']}")
    assert resp.status_code == 204
    resp = await admin_client.get(f"/api/v1/milestones/{milestone['id']}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_milestone_requires_admin(client, milestone):
    resp = await client.delete(f"/api/v1/milestones/{milestone['id']}")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_milestone_not_found(admin_client):
    resp = await admin_client.delete("/api/v1/milestones/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_milestone_sections_empty(client, milestone):
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}")
    assert resp.json()["sections"] == []


@pytest.mark.asyncio
async def test_milestone_detail_has_test_case_counts(admin_client, milestone, test_case):
    resp = await admin_client.get(f"/api/v1/milestones/{milestone['id']}")
    sections = resp.json()["sections"]
    assert len(sections) == 1
    tcs = sections[0]["test_cases"]
    assert len(tcs) == 1
    assert tcs[0]["name"] == test_case["name"]
    assert "counts_by_arch" in tcs[0]


@pytest.mark.asyncio
async def test_urgent_needs_returns_untested_blockers(client, milestone, test_case):
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}/urgent-needs")
    assert resp.status_code == 200
    needs = resp.json()
    assert len(needs) == 1
    assert needs[0]["test_case_id"] == test_case["id"]
    assert needs[0]["blocking"] == "blocker"


@pytest.mark.asyncio
async def test_urgent_needs_excludes_tested(admin_client, client, milestone, test_case):
    # Submit a result for the blocker
    await admin_client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}/urgent-needs")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_urgent_needs_excludes_normal_test_cases(client, milestone, normal_test_case):
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}/urgent-needs")
    # normal_test_case is blocking="normal", should not appear in urgent needs
    needs = resp.json()
    ids = [n["test_case_id"] for n in needs]
    assert normal_test_case["id"] not in ids


@pytest.mark.asyncio
async def test_urgent_needs_capped_at_ten(admin_client, client, milestone, section):
    # Create 12 blocker test cases
    for i in range(12):
        await admin_client.post(
            f"/api/v1/sections/{section['id']}/test-cases",
            json={"name": f"Blocker test {i}", "blocking": "blocker"},
        )
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}/urgent-needs")
    assert len(resp.json()) == 10


@pytest.mark.asyncio
async def test_coverage_grid_empty(client, milestone, test_case):
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}/coverage")
    assert resp.status_code == 200
    data = resp.json()
    assert "sections" in data
    assert "arches" in data
    assert "grid" in data
    assert data["arches"] == []  # no results yet, no arches


@pytest.mark.asyncio
async def test_coverage_grid_with_results(admin_client, client, milestone, test_case):
    await admin_client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "vm-kvm"},
    )
    await admin_client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "FAIL", "arch": "aarch64", "deploy_type": "bare-metal"},
    )
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}/coverage")
    data = resp.json()
    assert "x86_64" in data["arches"]
    assert "aarch64" in data["arches"]
    # Find the cell for our section + x86_64
    sec_id = milestone.get("sections", [None])[0] if "sections" in milestone else None
    # Coverage grid keys are "{section_id}_{arch}"
    assert any("x86_64" in k for k in data["grid"])
