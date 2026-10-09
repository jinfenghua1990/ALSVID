import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from alsvid.config import Settings
from alsvid.models.auth import AuthSession, UserAuthCredential
from alsvid.models.core import AuditEvent, User

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 32
_DUMMY_SALT = b"alsvid-auth-v1!!"


class AuthenticationFailed(Exception):
    pass


class SessionAccessDenied(Exception):
    pass


@dataclass(frozen=True)
class IssuedSession:
    session: AuthSession
    token: str


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _derive_password(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_SCRYPT_DKLEN,
    )


def _audit(
    db: Session,
    *,
    actor_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str,
) -> None:
    db.add(
        AuditEvent(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )


def _burn_password_verification(password: str) -> None:
    digest = _derive_password(password, _DUMMY_SALT)
    hmac.compare_digest(digest, bytes(_SCRYPT_DKLEN))


def encode_password(password: str, *, min_length: int = 12) -> str:
    if len(password) < min_length:
        raise ValueError(f"Password must be at least {min_length} characters")
    salt = secrets.token_bytes(16)
    digest = _derive_password(password, salt)
    return (
        f"scrypt-v1${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}$"
        f"{_b64encode(salt)}${_b64encode(digest)}"
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$", 5)
        if algorithm != "scrypt-v1":
            return False
        expected_bytes = _b64decode(expected)
        digest = hashlib.scrypt(
            password.encode("utf-8"),
            salt=_b64decode(salt),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected_bytes),
        )
        return hmac.compare_digest(digest, expected_bytes)
    except (ValueError, TypeError):
        return False


def set_user_password(
    db: Session,
    *,
    user: User,
    password: str,
    settings: Settings,
) -> UserAuthCredential:
    credential = db.get(UserAuthCredential, user.id)
    encoded = encode_password(password, min_length=settings.password_min_length)
    now = _utcnow()
    if credential is None:
        credential = UserAuthCredential(
            user_id=user.id,
            password_hash=encoded,
            failed_attempts=0,
            locked_until=None,
            password_changed_at=now,
        )
        db.add(credential)
    else:
        credential.password_hash = encoded
        credential.failed_attempts = 0
        credential.locked_until = None
        credential.password_changed_at = now

    active_sessions = db.scalars(
        select(AuthSession).where(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        )
    ).all()
    for session in active_sessions:
        session.revoked_at = now

    _audit(
        db,
        actor_id=user.id,
        action="auth.password.changed",
        entity_type="user",
        entity_id=user.id,
    )
    db.flush()
    return credential


def authenticate_user(
    db: Session,
    *,
    email: str,
    password: str,
    settings: Settings,
) -> User:
    normalized_email = email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if user is None or not user.active:
        _burn_password_verification(password)
        raise AuthenticationFailed("Invalid credentials")

    credential = db.get(UserAuthCredential, user.id)
    if credential is None:
        _burn_password_verification(password)
        raise AuthenticationFailed("Invalid credentials")

    now = _utcnow()
    if credential.locked_until is not None and _as_utc(credential.locked_until) > now:
        _burn_password_verification(password)
        raise AuthenticationFailed("Invalid credentials")

    if not verify_password(password, credential.password_hash):
        credential.failed_attempts += 1
        if credential.failed_attempts >= settings.auth_lockout_attempts:
            credential.locked_until = now + timedelta(minutes=settings.auth_lockout_minutes)
            credential.failed_attempts = 0
        db.flush()
        raise AuthenticationFailed("Invalid credentials")

    credential.failed_attempts = 0
    credential.locked_until = None
    db.flush()
    return user


def issue_session(
    db: Session,
    *,
    user: User,
    settings: Settings,
) -> IssuedSession:
    if not user.active:
        raise SessionAccessDenied("User identity is inactive")
    raw_token = secrets.token_urlsafe(48)
    session = AuthSession(
        user_id=user.id,
        token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
        csrf_token=secrets.token_urlsafe(32),
        expires_at=_utcnow() + timedelta(hours=settings.session_ttl_hours),
    )
    db.add(session)
    db.flush()
    _audit(
        db,
        actor_id=user.id,
        action="auth.session.created",
        entity_type="auth_session",
        entity_id=session.id,
    )
    db.flush()
    return IssuedSession(session=session, token=raw_token)


def get_session_by_token(db: Session, *, token: str) -> AuthSession:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))
    if (
        session is None
        or session.revoked_at is not None
        or _as_utc(session.expires_at) <= _utcnow()
    ):
        raise SessionAccessDenied("Session is invalid or expired")

    user = db.get(User, session.user_id)
    if user is None or not user.active:
        raise SessionAccessDenied("Session identity is inactive")

    session.last_seen_at = _utcnow()
    db.flush()
    return session


def revoke_session(db: Session, *, session: AuthSession) -> None:
    if session.revoked_at is None:
        session.revoked_at = _utcnow()
        _audit(
            db,
            actor_id=session.user_id,
            action="auth.session.revoked",
            entity_type="auth_session",
            entity_id=session.id,
        )
        db.flush()


def verify_csrf(session: AuthSession, token: str | None) -> bool:
    return token is not None and hmac.compare_digest(session.csrf_token, token)
