import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_admin_session, get_current_user, get_is_admin
from app.models.user import User, UserSession

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_DAYS = 7


# ── Admin token login (unchanged) ────────────────────────────────────────────


class LoginRequest(BaseModel):
    token: str


@router.post("/login")
async def login(body: LoginRequest, response: Response):
    if body.token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    session = create_admin_session()
    response.set_cookie(
        key="admin_session",
        value=session,
        httponly=True,
        samesite="lax",
        max_age=86400 * SESSION_DAYS,
    )
    return {"ok": True}


# ── User registration ────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    username: str
    display_name: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) < 3 or len(v) > 40:
            raise ValueError("Username must be 3-40 characters")
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, hyphens, underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1 or len(v) > 100:
            raise ValueError("Display name must be 1-100 characters")
        return v


@router.post("/register")
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")

    pw_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = User(
        username=body.username,
        display_name=body.display_name,
        password_hash=pw_hash,
    )
    db.add(user)
    await db.flush()

    token = secrets.token_urlsafe(48)
    session = UserSession(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
    )
    db.add(session)
    await db.commit()

    response.set_cookie(
        key="user_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400 * SESSION_DAYS,
    )
    return {
        "ok": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
            "is_test_team": user.is_test_team,
        },
    }


# ── User login ───────────────────────────────────────────────────────────────


class UserLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login-user")
async def login_user(body: UserLoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username.strip().lower()))
    user = result.scalar_one_or_none()
    if not user or user.disabled:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user.last_login = datetime.now(timezone.utc)

    token = secrets.token_urlsafe(48)
    session = UserSession(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
    )
    db.add(session)
    await db.commit()

    response.set_cookie(
        key="user_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400 * SESSION_DAYS,
    )
    return {
        "ok": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
            "is_test_team": user.is_test_team,
        },
    }


# ── Logout ───────────────────────────────────────────────────────────────────


@router.post("/logout")
async def logout(
    response: Response,
    user_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    response.delete_cookie("admin_session")
    response.delete_cookie("user_session")
    if user_session:
        result = await db.execute(
            select(UserSession).where(UserSession.token == user_session)
        )
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
    return {"ok": True}


# ── Me ───────────────────────────────────────────────────────────────────────


@router.get("/me")
async def me(
    is_admin: bool = Depends(get_is_admin),
    user: User | None = Depends(get_current_user),
):
    return {
        "is_admin": is_admin or (user is not None and user.role == "admin"),
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
            "is_test_team": user.is_test_team,
        } if user else None,
    }
