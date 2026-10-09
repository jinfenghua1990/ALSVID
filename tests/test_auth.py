from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from alsvid.config import Settings
from alsvid.db import Base
from alsvid.models import AuthSession, User
from alsvid.services.auth import (
    AuthenticationFailed,
    authenticate_user,
    get_session_by_token,
    issue_session,
    set_user_password,
)


def _settings() -> Settings:
    return Settings(
        environment="test",
        database_url="sqlite+pysqlite:///:memory:",
        password_min_length=12,
        session_ttl_hours=12,
    )


def test_session_identity_has_no_workspace_selector() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    settings = _settings()

    with Session(engine) as db:
        user = User(email="owner@alsvid.test", display_name="Owner")
        db.add(user)
        db.flush()
        set_user_password(
            db,
            user=user,
            password="strong-bike-password",
            settings=settings,
        )
        issued = issue_session(db, user=user, settings=settings)
        db.commit()

        assert isinstance(issued.session, AuthSession)
        assert not hasattr(issued.session, "current_workspace_id")
        resolved = get_session_by_token(db, token=issued.token)
        assert resolved.user_id == user.id


def test_password_authentication_remains_independent_of_workspace_membership() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    settings = _settings()

    with Session(engine) as db:
        user = User(email="buyer@example.com", display_name="Buyer")
        db.add(user)
        db.flush()
        set_user_password(
            db,
            user=user,
            password="bike-owner-password",
            settings=settings,
        )
        db.commit()

        authenticated = authenticate_user(
            db,
            email="Buyer@Example.com",
            password="bike-owner-password",
            settings=settings,
        )
        assert authenticated.id == user.id

        try:
            authenticate_user(
                db,
                email="Buyer@Example.com",
                password="wrong-password",
                settings=settings,
            )
        except AuthenticationFailed:
            pass
        else:
            raise AssertionError("wrong password must not authenticate")
