from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from alsvid.config import Settings, get_settings
from alsvid.db import get_db
from alsvid.models.auth import AuthSession
from alsvid.models.core import User
from alsvid.services.access import AccessDenied, require_permission
from alsvid.services.auth import SessionAccessDenied, get_session_by_token, verify_csrf


@dataclass(frozen=True)
class Principal:
    user: User
    session: AuthSession


def current_principal(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Principal:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        session = get_session_by_token(db, token=token)
    except SessionAccessDenied as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or expired",
        ) from exc
    user = db.get(User, session.user_id)
    if user is None or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return Principal(user=user, session=session)


def permission_dependency(permission: str):
    def dependency(
        principal: Principal = Depends(current_principal),
        db: Session = Depends(get_db),
    ) -> Principal:
        try:
            require_permission(db, user_id=principal.user.id, permission=permission)
        except AccessDenied as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied") from exc
        return principal

    return dependency


def enforce_csrf(request: Request, principal: Principal) -> None:
    if not verify_csrf(principal.session, request.headers.get("X-CSRF-Token")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")
