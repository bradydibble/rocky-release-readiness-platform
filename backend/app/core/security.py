from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from fastapi import Cookie, Depends, HTTPException, status

from app.core.config import settings

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
