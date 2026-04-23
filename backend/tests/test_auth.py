import pytest


@pytest.mark.asyncio
async def test_login_correct_token(client):
    resp = await client.post("/api/v1/auth/login", json={"token": "test-admin-token"})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}
    assert "admin_session" in resp.cookies


@pytest.mark.asyncio
async def test_login_wrong_token(client):
    resp = await client.post("/api/v1/auth/login", json={"token": "wrong-token"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_empty_token(client):
    resp = await client.post("/api/v1/auth/login", json={"token": ""})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_logout(admin_client):
    resp = await admin_client.post("/api/v1/auth/logout")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


@pytest.mark.asyncio
async def test_me_as_admin(admin_client):
    resp = await admin_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is True


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is False


@pytest.mark.asyncio
async def test_me_after_logout(admin_client):
    await admin_client.post("/api/v1/auth/logout")
    resp = await admin_client.get("/api/v1/auth/me")
    assert resp.json()["is_admin"] is False
