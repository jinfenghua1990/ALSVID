from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from alsvid.bootstrap import bootstrap_reference_data
from alsvid.config import Settings, get_settings
from alsvid.db import Base, get_db
from alsvid.main import app
from alsvid.models import BusinessPartner, Product, Role, SKU, User, UserRole
from alsvid.models.commercial import ExportShipment
from alsvid.models.inventory import DealerInventoryReservation, InventoryMovement
from alsvid.services.auth import issue_session


def _context() -> tuple[TestClient, sessionmaker[Session], str]:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    settings = Settings(
        environment="test",
        database_url="sqlite+pysqlite://",
        session_cookie_name="alsvid_session",
        session_cookie_secure=False,
        password_min_length=12,
    )

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = lambda: settings
    with factory() as db:
        bootstrap_reference_data(db)
        admin = User(email="supply@alsvid.test", display_name="Supply Admin")
        dealer = BusinessPartner(
            id="bp_inventory_dealer",
            code="DEALER-INV",
            name="Dealer Inventory",
            country_code="DE",
            is_dealer=True,
        )
        product = Product(id="prd_inventory", code="FC1-INV", name="FC1 Inventory")
        sku = SKU(id="sku_inventory", product_id=product.id, code="FC1-BLK", name="FC1 Black")
        db.add_all([admin, dealer, product, sku])
        db.flush()
        role = db.scalar(select(Role).where(Role.code == "ADMIN"))
        assert role is not None
        db.add(UserRole(user_id=admin.id, role_id=role.id))
        issued = issue_session(db, user=admin, settings=settings)
        db.commit()
    client = TestClient(app)
    client.cookies.set(settings.session_cookie_name, issued.token)
    return client, factory, issued.session.csrf_token


def test_inventory_reservation_is_alsvid_owned_and_releases_availability() -> None:
    client, factory, csrf = _context()
    headers = {"X-CSRF-Token": csrf}
    try:
        location = client.post(
            "/api/v1/inventory/locations",
            headers=headers,
            json={
                "code": "DE-WH-01",
                "name": "Germany Warehouse",
                "location_type": "WAREHOUSE",
                "country_code": "DE",
            },
        )
        assert location.status_code == 201
        location_id = location.json()["id"]
        movement = client.post(
            "/api/v1/inventory/movements",
            headers=headers,
            json={
                "location_id": location_id,
                "sku_id": "sku_inventory",
                "quantity_delta": "10",
                "movement_type": "RECEIPT",
            },
        )
        assert movement.status_code == 201
        reservation = client.post(
            "/api/v1/inventory/reservations",
            headers=headers,
            json={
                "dealer_partner_id": "bp_inventory_dealer",
                "location_id": location_id,
                "sku_id": "sku_inventory",
                "quantity": "3",
                "reservation_kind": "QUOTE",
                "external_system": "SHOPIFY",
                "external_id": "draft-1001",
            },
        )
        assert reservation.status_code == 201
        assert float(reservation.json()["availability"]["public_available"]) == 7.0
        reservation_id = reservation.json()["id"]
        released = client.post(
            f"/api/v1/inventory/reservations/{reservation_id}/release",
            headers=headers,
        )
        assert released.status_code == 200
        availability = client.get(
            "/api/v1/inventory/availability",
            params={"location_id": location_id, "sku_id": "sku_inventory"},
        )
        assert availability.status_code == 200
        assert float(availability.json()["public_available"]) == 10.0
        with factory() as db:
            assert db.scalar(select(InventoryMovement)).quantity_delta == 10
            assert db.scalar(select(DealerInventoryReservation)).status == "RELEASED"
    finally:
        app.dependency_overrides.clear()


def test_shipment_compliance_keeps_eu_customs_and_refund_facts() -> None:
    client, factory, csrf = _context()
    headers = {"X-CSRF-Token": csrf}
    try:
        shipment = client.post(
            "/api/v1/logistics/shipments",
            headers=headers,
            json={"shipment_no": "ALS-DE-0002", "destination_country": "DE"},
        )
        assert shipment.status_code == 201
        shipment_id = shipment.json()["id"]
        response = client.put(
            f"/api/v1/logistics/shipments/{shipment_id}/compliance",
            headers=headers,
            json={
                "importer_kind": "DEALER",
                "importer_partner_id": "bp_inventory_dealer",
                "booking_no": "BK-1",
                "bill_of_lading_no": "BL-1",
                "container_no": "CONT-1",
                "eori_no": "DE123456789",
                "hs_code": "87116010",
                "cn_code": "87116010",
                "manufacturer_name": "ALSVID Factory",
                "customs_rate": "6",
                "anti_dumping_rate": "20.7",
                "import_vat_rate": "19",
                "import_vat_recoverable": True,
                "clearance_fee": "80",
                "port_fee": "120",
                "last_mile_fee": "95",
                "export_refund_base_cny": "12000",
                "export_refund_rate": "13",
                "eur_to_cny": "8.25",
            },
        )
        assert response.status_code == 200
        assert response.json()["bill_of_lading_no"] == "BL-1"
        assert response.json()["hs_code"] == "87116010"
        with factory() as db:
            row = db.get(ExportShipment, shipment_id)
            assert row is not None
            assert row.importer_kind == "DEALER"
            assert row.container_no == "CONT-1"
            assert row.import_vat_recoverable is True
    finally:
        app.dependency_overrides.clear()
