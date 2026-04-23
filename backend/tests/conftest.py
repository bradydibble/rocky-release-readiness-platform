"""
Shared test fixtures.

Environment variables must be set BEFORE any app code is imported so that
pydantic-settings and itsdangerous pick up the test values at module-load time.
"""
import os

os.environ["ADMIN_TOKEN"] = "test-admin-token"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.db import Base, get_db

SQLITE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def db_engine():
    engine = create_async_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


def _make_db_override(db_engine):
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    return override_get_db


@pytest_asyncio.fixture()
async def client(db_engine):
    app.dependency_overrides[get_db] = _make_db_override(db_engine)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture()
async def admin_client(db_engine):
    """Independent client with admin session — does NOT share the client fixture instance."""
    app.dependency_overrides[get_db] = _make_db_override(db_engine)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.post("/api/v1/auth/login", json={"token": "test-admin-token"})
        assert resp.status_code == 200
        yield c
    app.dependency_overrides.pop(get_db, None)


# ── Entity fixtures ────────────────────────────────────────────────────────────


@pytest_asyncio.fixture()
async def release(admin_client):
    resp = await admin_client.post(
        "/api/v1/releases",
        json={"name": "Rocky Linux", "version": "9.8", "notes": "test release"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture()
async def milestone(admin_client, release):
    resp = await admin_client.post(
        f"/api/v1/milestones/releases/{release['id']}",
        json={"name": "beta", "status": "open"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture()
async def closed_milestone(admin_client, release):
    resp = await admin_client.post(
        f"/api/v1/milestones/releases/{release['id']}",
        json={"name": "rc1", "status": "open"},
    )
    ms = resp.json()
    await admin_client.patch(
        f"/api/v1/milestones/{ms['id']}",
        json={"status": "closed"},
    )
    ms["status"] = "closed"
    return ms


@pytest_asyncio.fixture()
async def section(admin_client, milestone):
    resp = await admin_client.post(
        f"/api/v1/milestones/{milestone['id']}/sections",
        json={"name": "Post-Installation Requirements", "architecture": "x86_64"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture()
async def test_case(admin_client, section):
    resp = await admin_client.post(
        f"/api/v1/sections/{section['id']}/test-cases",
        json={"name": "SELinux enforcing on clean boot", "blocking": "blocker"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture()
async def normal_test_case(admin_client, section):
    resp = await admin_client.post(
        f"/api/v1/sections/{section['id']}/test-cases",
        json={"name": "Cockpit web console reachable", "blocking": "normal"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture()
async def section_in_closed(admin_client, closed_milestone):
    resp = await admin_client.post(
        f"/api/v1/milestones/{closed_milestone['id']}/sections",
        json={"name": "Installer", "architecture": "x86_64"},
    )
    return resp.json()


@pytest_asyncio.fixture()
async def test_case_in_closed(admin_client, section_in_closed):
    resp = await admin_client.post(
        f"/api/v1/sections/{section_in_closed['id']}/test-cases",
        json={"name": "Graphical install - Minimal", "blocking": "blocker"},
    )
    return resp.json()
