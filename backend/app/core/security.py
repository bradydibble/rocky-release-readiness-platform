from datetime import datetime, timezone

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db

_signer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="admin-session")

SESSION_MAX_AGE = 86400 * 7  # 7 days


def create_admin_session() -> str:
    return _signer.dumps("admin")


def _verify(token: str | None) -> bool:
    if not token:
        return False
    try:
        _signer.loads(token, max_age=SESSION_MAX_AGE)
        return True
    except (BadSignature, SignatureExpired):
        return False


def get_is_admin(admin_session: str | None = Cookie(default=None)) -> bool:
    return _verify(admin_session)


def require_admin(admin_session: str | None = Cookie(default=None)) -> None:
    if not _verify(admin_session):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required",
        )


async def get_current_user(
    user_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Return the logged-in User or None for anonymous requests."""
    if not user_session:
        return None
    from app.models.user import User, UserSession

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(User)
        .join(UserSession, UserSession.user_id == User.id)
        .where(
            UserSession.token == user_session,
            UserSession.expires_at > now,
            User.disabled == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()
