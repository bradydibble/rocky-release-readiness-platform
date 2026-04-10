from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import create_admin_session, get_is_admin

router = APIRouter(prefix="/auth", tags=["auth"])


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
        max_age=86400 * 7,
    )
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("admin_session")
    return {"ok": True}


@router.get("/me")
async def me(is_admin: bool = Depends(get_is_admin)):
    return {"is_admin": is_admin}
