import pytest


@pytest.mark.asyncio
async def test_list_releases_empty(client):
    resp = await client.get("/api/v1/releases")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_release_requires_admin(client):
    resp = await client.post(
        "/api/v1/releases",
        json={"name": "Rocky Linux", "version": "9.8"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_release(admin_client):
    resp = await admin_client.post(
        "/api/v1/releases",
        json={"name": "Rocky Linux", "version": "9.8", "notes": "beta cycle"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Rocky Linux"
    assert data["version"] == "9.8"
    assert data["notes"] == "beta cycle"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_releases_after_create(admin_client, release):
    resp = await admin_client.get("/api/v1/releases")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == release["id"]


@pytest.mark.asyncio
async def test_get_release(client, release):
    resp = await client.get(f"/api/v1/releases/{release['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == release["id"]
    assert data["name"] == release["name"]
    assert "milestones" in data


@pytest.mark.asyncio
async def test_get_release_not_found(client):
    resp = await client.get("/api/v1/releases/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_patch_release(admin_client, release):
    resp = await admin_client.patch(
        f"/api/v1/releases/{release['id']}",
        json={"notes": "updated notes"},
    )
    assert resp.status_code == 200
    assert resp.json()["notes"] == "updated notes"


@pytest.mark.asyncio
async def test_patch_release_requires_admin(client, release):
    resp = await client.patch(
        f"/api/v1/releases/{release['id']}",
        json={"notes": "should fail"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_release(admin_client, release):
    resp = await admin_client.delete(f"/api/v1/releases/{release['id']}")
    assert resp.status_code == 204
    # Confirm gone
    resp = await admin_client.get(f"/api/v1/releases/{release['id']}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_release_requires_admin(client, release):
    resp = await client.delete(f"/api/v1/releases/{release['id']}")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_release_not_found(admin_client):
    resp = await admin_client.delete("/api/v1/releases/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_release_milestone_count_in_list(admin_client, release, milestone):
    resp = await admin_client.get("/api/v1/releases")
    assert resp.status_code == 200
    data = resp.json()
    entry = next(r for r in data if r["id"] == release["id"])
    # milestone stub fields should be present
    milestones = entry.get("milestones", [])
    assert len(milestones) == 1
    assert milestones[0]["name"] == "beta"
