from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from alsvid.bootstrap import bootstrap_reference_data
from alsvid.config import Settings, get_settings
from alsvid.db import Base, get_db
from alsvid.main import app
from alsvid.models import BusinessPartner, Role, User, UserRole
from alsvid.models.commercial import CommercialFinanceFact, CommercialOrderFact, ExportShipment, ShipmentMilestone
from alsvid.services.auth import issue_session


def _settings() -> Settings:
    return Settings(environment="test", database_url="sqlite+pysqlite://", session_cookie_name="alsvid_session", session_cookie_secure=False, password_min_length=12)


def _context() -> tuple[TestClient, sessionmaker[Session], Settings, str]:
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    settings = _settings()

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = lambda: settings
    with factory() as db:
        bootstrap_reference_data(db)
        admin = User(email="ops@alsvid.test", display_name="Operations Admin")
        dealer = BusinessPartner(id="bp_export_dealer", code="DE-001", name="German Dealer", country_code="DE", is_dealer=True)
        db.add_all([admin, dealer])
        db.flush()
        role = db.scalar(select(Role).where(Role.code == "ADMIN"))
        assert role is not None
        db.add(UserRole(user_id=admin.id, role_id=role.id))
        issued = issue_session(db, user=admin, settings=settings)
        db.commit()
    client = TestClient(app)
    client.cookies.set(settings.session_cookie_name, issued.token)
    return client, factory, settings, issued.session.csrf_token


def test_export_operations_foundation_keeps_shopify_as_external_order_fact() -> None:
    client, factory, _settings_value, csrf = _context()
    headers = {"X-CSRF-Token": csrf}
    try:
        channel = client.post("/api/v1/commercial/channels", headers=headers, json={"code": "shopify-eu", "name": "Shopify EU", "channel_type": "ECOMMERCE", "external_system": "shopify", "currency": "eur", "countries": ["de", "at"]})
        assert channel.status_code == 201
        order_fact = client.post("/api/v1/commercial/order-facts", headers=headers, json={"external_system": "shopify", "external_order_id": "gid://shopify/Order/1001", "channel_id": channel.json()["id"], "dealer_partner_id": "bp_export_dealer", "business_mode": "B2B", "currency": "EUR", "gross_amount": "3299.00", "paid_amount": "3299.00", "ordered_at": "2026-10-09T09:00:00Z", "metadata": {"source": "confirmed-import"}})
        assert order_fact.status_code == 201
        shipment = client.post("/api/v1/logistics/shipments", headers=headers, json={"shipment_no": "als-eu-0001", "order_fact_id": order_fact.json()["id"], "dealer_partner_id": "bp_export_dealer", "destination_country": "de", "destination_city": "Cologne", "transport_mode": "rail", "incoterm": "DAP", "declared_value": "2800.00", "freight_amount": "220.00", "import_vat_amount": "532.00"})
        assert shipment.status_code == 201
        shipment_id = shipment.json()["id"]
        milestone = client.post(f"/api/v1/logistics/shipments/{shipment_id}/milestones", headers=headers, json={"code": "DEPARTED_CHINA", "location": "Yiwu", "occurred_at": "2026-10-09T10:00:00Z"})
        assert milestone.status_code == 201
        assert milestone.json()["shipment_status"] == "IN_TRANSIT"
        finance = client.post("/api/v1/finance/facts", headers=headers, json={"fact_type": "IMPORT_VAT", "direction": "PAYABLE", "source_type": "SHIPMENT", "source_id": shipment_id, "partner_id": "bp_export_dealer", "currency": "EUR", "amount": "532.00", "tax_amount": "0", "occurred_at": "2026-10-09T10:30:00Z"})
        assert finance.status_code == 201
        with factory() as db:
            assert db.scalar(select(CommercialOrderFact)).external_system == "SHOPIFY"
            assert db.scalar(select(ExportShipment)).status == "IN_TRANSIT"
            assert db.scalar(select(ShipmentMilestone)).code == "DEPARTED_CHINA"
            assert db.scalar(select(CommercialFinanceFact)).fact_type == "IMPORT_VAT"
    finally:
        app.dependency_overrides.clear()


def test_b2b_order_fact_requires_canonical_dealer_partner() -> None:
    client, _factory, _settings_value, csrf = _context()
    try:
        response = client.post("/api/v1/commercial/order-facts", headers={"X-CSRF-Token": csrf}, json={"external_system": "shopify", "external_order_id": "gid://shopify/Order/1002", "business_mode": "B2B", "currency": "EUR"})
        assert response.status_code == 422
        assert response.json()["detail"] == "B2B order fact requires a dealer"
    finally:
        app.dependency_overrides.clear()
