from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, current_principal, enforce_csrf
from alsvid.config import Settings, get_settings
from alsvid.db import get_db
from alsvid.services.auth import (
    AuthenticationFailed,
    authenticate_user,
    issue_session,
    revoke_session,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SessionResponse(BaseModel):
    authenticated: bool = True
    display_name: str
    email: str
    csrf_token: str


def _set_session_cookie(response: Response, *, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_hours * 60 * 60,
        httponly=True,
        secure=settings.secure_session_cookie,
        samesite="lax",
        path="/",
    )


@router.post("/login", response_model=SessionResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    try:
        user = authenticate_user(
            db,
            email=str(payload.email),
            password=payload.password,
            settings=settings,
        )
    except AuthenticationFailed as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials") from exc
    issued = issue_session(db, user=user, settings=settings)
    db.commit()
    _set_session_cookie(response, token=issued.token, settings=settings)
    return SessionResponse(
        display_name=user.display_name,
        email=user.email,
        csrf_token=issued.session.csrf_token,
    )


@router.get("/session", response_model=SessionResponse)
def session_info(principal: Principal = Depends(current_principal)) -> SessionResponse:
    return SessionResponse(
        display_name=principal.user.display_name,
        email=principal.user.email,
        csrf_token=principal.session.csrf_token,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    enforce_csrf(request, principal)
    revoke_session(db, session=principal.session)
    db.commit()
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        secure=settings.secure_session_cookie,
        httponly=True,
        samesite="lax",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
