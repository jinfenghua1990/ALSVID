from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from alsvid.bootstrap import bootstrap_reference_data
from alsvid.config import Settings, get_settings
from alsvid.db import Base, get_db
from alsvid.main import app
from alsvid.models import (
    Asset,
    BusinessPartner,
    DealerPortalMember,
    DealerProfile,
    MarketingConsentEvent,
    MyAlsvidAccount,
    Role,
    ServiceCase,
    User,
    UserRole,
    Vehicle,
)
from alsvid.services.auth import issue_session, set_user_password
from alsvid.services.my_alsvid import issue_vehicle_claim_token


def _settings() -> Settings:
    return Settings(
        environment="test",
        database_url="sqlite+pysqlite://",
        session_cookie_name="alsvid_session",
        session_cookie_secure=False,
        password_min_length=12,
    )


def _test_context() -> tuple[TestClient, sessionmaker[Session], Settings]:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    settings = _settings()

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = lambda: settings
    client = TestClient(app)
    return client, factory, settings


def _role(db: Session, code: str) -> Role:
    role = db.scalar(select(Role).where(Role.code == code))
    assert role is not None
    return role


def _session_cookie(
    db: Session,
    *,
    user: User,
    settings: Settings,
) -> tuple[str, str]:
    issued = issue_session(db, user=user, settings=settings)
    db.commit()
    return issued.token, issued.session.csrf_token


def test_auth_uses_alsvid_cookie_and_requires_csrf_for_logout() -> None:
    client, factory, settings = _test_context()
    try:
        with factory() as db:
            bootstrap_reference_data(db)
            user = User(email="admin@example.com", display_name="Admin")
            db.add(user)
            db.flush()
            db.add(UserRole(user_id=user.id, role_id=_role(db, "ADMIN").id))
            set_user_password(
                db,
                user=user,
                password="standalone-bike-password",
                settings=settings,
            )
            db.commit()

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "standalone-bike-password"},
        )
        assert response.status_code == 200
        assert "alsvid_session=" in response.headers["set-cookie"]
        assert "chaiben" not in response.headers["set-cookie"].lower()
        csrf = response.json()["csrf_token"]

        session_response = client.get("/api/v1/auth/session")
        assert session_response.status_code == 200
        assert session_response.json()["email"] == "admin@example.com"

        assert client.post("/api/v1/auth/logout").status_code == 403
        assert client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf}).status_code == 204
        assert client.get("/api/v1/auth/session").status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_dealer_api_is_scoped_and_does_not_return_internal_or_buyer_fields() -> None:
    client, factory, settings = _test_context()
    try:
        with factory() as db:
            bootstrap_reference_data(db)
            user = User(email="dealer@alsvid.test", display_name="Dealer User")
            dealer_a = BusinessPartner(
                id="bp_api_dealer_a",
                code="API-DA",
                name="Dealer A",
                is_dealer=True,
            )
            dealer_b = BusinessPartner(
                id="bp_api_dealer_b",
                code="API-DB",
                name="Dealer B",
                is_dealer=True,
            )
            db.add_all([user, dealer_a, dealer_b])
            db.flush()
            db.add(UserRole(user_id=user.id, role_id=_role(db, "ALSVID_DEALER").id))
            db.add(
                DealerProfile(
                    partner_id=dealer_a.id,
                    authorization_status="APPROVED",
                )
            )
            db.add(DealerPortalMember(user_id=user.id, dealer_partner_id=dealer_a.id))
            own_vehicle = Vehicle(
                id="veh_api_dealer_a",
                model_id="mdl_unknown",
                frame_number="ALS-API-DA-001",
                bom_revision_id="bomr_unknown",
                build_snapshot={"model": {"code": "FC1"}},
                factory_outbound_at=datetime.now(UTC),
                current_dealer_partner_id=dealer_a.id,
                status="IN_TRANSIT",
            )
            other_vehicle = Vehicle(
                id="veh_api_dealer_b",
                model_id="mdl_unknown",
                frame_number="ALS-API-DB-001",
                bom_revision_id="bomr_unknown",
                build_snapshot={"model": {"code": "FC1"}},
                factory_outbound_at=datetime.now(UTC),
                current_dealer_partner_id=dealer_b.id,
                status="IN_TRANSIT",
            )
            db.add_all([own_vehicle, other_vehicle])
            db.flush()
            token, csrf = _session_cookie(db, user=user, settings=settings)

        client.cookies.set(settings.session_cookie_name, token)
        own = client.get("/api/v1/dealer/vehicles/ALS-API-DA-001")
        assert own.status_code == 200
        payload = own.json()
        assert set(payload) == {"frame_number", "status", "model_code", "purchase_date"}
        assert "id" not in payload
        assert "customer" not in " ".join(payload.keys()).lower()

        other = client.get("/api/v1/dealer/vehicles/ALS-API-DB-001")
        assert other.status_code == 404

        missing_csrf = client.post(
            "/api/v1/dealer/vehicles/ALS-API-DA-001/receipt",
            json={"reference": "IN-1"},
        )
        assert missing_csrf.status_code == 403
        receipt = client.post(
            "/api/v1/dealer/vehicles/ALS-API-DA-001/receipt",
            headers={"X-CSRF-Token": csrf},
            json={"reference": "IN-1"},
        )
        assert receipt.status_code == 200
        assert receipt.json()["status"] == "DEALER_STOCK"
    finally:
        app.dependency_overrides.clear()


def test_my_alsvid_garage_is_owner_scoped_and_hides_internal_service_and_asset_data() -> None:
    client, factory, settings = _test_context()
    try:
        with factory() as db:
            bootstrap_reference_data(db)
            user = User(email="owner@alsvid.test", display_name="Owner")
            owner = BusinessPartner(
                id="bp_api_owner",
                code="OWNER",
                name="Owner",
                email="owner@alsvid.test",
                is_customer=True,
            )
            other_owner = BusinessPartner(
                id="bp_api_other",
                code="OTHER",
                name="Other Owner",
                email="other@alsvid.test",
                is_customer=True,
            )
            db.add_all([user, owner, other_owner])
            db.flush()
            db.add(UserRole(user_id=user.id, role_id=_role(db, "ALSVID_BUYER").id))
            db.add(MyAlsvidAccount(user_id=user.id, partner_id=owner.id))
            own_vehicle = Vehicle(
                id="veh_api_owner",
                model_id="mdl_unknown",
                frame_number="ALS-OWNER-001",
                bom_revision_id="bomr_unknown",
                build_snapshot={"model": {"code": "FC1"}},
                factory_outbound_at=datetime.now(UTC),
                current_customer_partner_id=owner.id,
                status="ACTIVE",
            )
            other_vehicle = Vehicle(
                id="veh_api_other",
                model_id="mdl_unknown",
                frame_number="ALS-OTHER-001",
                bom_revision_id="bomr_unknown",
                build_snapshot={"model": {"code": "FC1"}},
                factory_outbound_at=datetime.now(UTC),
                current_customer_partner_id=other_owner.id,
                status="ACTIVE",
            )
            db.add_all([own_vehicle, other_vehicle])
            db.flush()
            db.add(
                Asset(
                    id="ast_api_owner",
                    owner_type="VEHICLE",
                    owner_id=own_vehicle.id,
                    asset_type="MANUAL",
                    purpose="owner-manual",
                    storage_key="private/internal/object-key.pdf",
                    file_name="manual.pdf",
                    mime_type="application/pdf",
                    visibility="CUSTOMER",
                )
            )
            db.add(
                ServiceCase(
                    id="svc_api_owner",
                    vehicle_id=own_vehicle.id,
                    status="OPEN",
                    priority="NORMAL",
                    issue_summary="Brake inspection",
                    diagnosis="internal diagnosis must not leave API",
                    resolution="internal resolution must not leave API",
                )
            )
            db.flush()
            token, _ = _session_cookie(db, user=user, settings=settings)

        client.cookies.set(settings.session_cookie_name, token)
        garage = client.get("/api/v1/my-alsvid/garage")
        assert garage.status_code == 200
        assert [item["frame_number"] for item in garage.json()] == ["ALS-OWNER-001"]

        detail = client.get("/api/v1/my-alsvid/garage/ALS-OWNER-001")
        assert detail.status_code == 200
        body = detail.json()
        serialized = detail.text.lower()
        assert "private/internal/object-key.pdf" not in serialized
        assert "internal diagnosis" not in serialized
        assert "internal resolution" not in serialized
        assert "storage_key" not in serialized
        assert "diagnosis" not in serialized
        assert "resolution" not in serialized
        assert body["assets"][0]["url"] is None

        assert client.get("/api/v1/my-alsvid/garage/ALS-OTHER-001").status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_claim_registration_is_one_time_and_does_not_grant_marketing_consent_implicitly() -> None:
    client, factory, settings = _test_context()
    try:
        with factory() as db:
            bootstrap_reference_data(db)
            vehicle = Vehicle(
                id="veh_api_claim",
                model_id="mdl_unknown",
                frame_number="ALS-CLAIM-API-001",
                bom_revision_id="bomr_unknown",
                build_snapshot={"model": {"code": "FC1"}},
                factory_outbound_at=datetime.now(UTC),
                status="FACTORY_OUTBOUND",
            )
            db.add(vehicle)
            db.commit()
            token, _ = issue_vehicle_claim_token(db, vehicle=vehicle, actor_id=None)
            db.commit()

        claimed = client.post(
            "/api/v1/my-alsvid/claim/register",
            json={
                "token": token,
                "email": "new-owner@example.com",
                "display_name": "New Owner",
                "password": "bike-owner-password",
                "email_marketing_consent": False,
            },
        )
        assert claimed.status_code == 200
        assert "alsvid_session=" in claimed.headers["set-cookie"]

        with factory() as db:
            assert db.scalar(select(func.count(MarketingConsentEvent.id))) == 0
            assert db.scalar(select(func.count(MyAlsvidAccount.user_id))) == 1

        second = client.post(
            "/api/v1/my-alsvid/claim/register",
            json={
                "token": token,
                "email": "second-owner@example.com",
                "display_name": "Second Owner",
                "password": "another-bike-password",
                "email_marketing_consent": False,
            },
        )
        assert second.status_code == 409
        with factory() as db:
            assert db.scalar(select(func.count(MyAlsvidAccount.user_id))) == 1
    finally:
        app.dependency_overrides.clear()
