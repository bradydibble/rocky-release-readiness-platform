from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import require_admin
from app.models.result import Result
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


class UserListItem(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    is_test_team: bool
    disabled: bool
    created_at: str
    last_login: str | None
    result_count: int


class UserUpdate(BaseModel):
    role: str | None = None
    is_test_team: bool | None = None
    disabled: bool | None = None


@router.get("/users", response_model=list[UserListItem])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    stmt = (
        select(
            User,
            func.count(Result.id).label("result_count"),
        )
        .outerjoin(Result, Result.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        UserListItem(
            id=row.User.id,
            username=row.User.username,
            display_name=row.User.display_name,
            role=row.User.role,
            is_test_team=row.User.is_test_team,
            disabled=row.User.disabled,
            created_at=row.User.created_at.isoformat(),
            last_login=row.User.last_login.isoformat() if row.User.last_login else None,
            result_count=row.result_count,
        )
        for row in rows
    ]


@router.patch("/users/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None:
        if body.role not in ("tester", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = body.role
    if body.is_test_team is not None:
        user.is_test_team = body.is_test_team
    if body.disabled is not None:
        user.disabled = body.disabled

    await db.commit()
    await db.refresh(user)

    result_count_stmt = select(func.count(Result.id)).where(Result.user_id == user.id)
    result_count = (await db.execute(result_count_stmt)).scalar() or 0

    return UserListItem(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        is_test_team=user.is_test_team,
        disabled=user.disabled,
        created_at=user.created_at.isoformat(),
        last_login=user.last_login.isoformat() if user.last_login else None,
        result_count=result_count,
    )
