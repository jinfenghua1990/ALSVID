from datetime import UTC, date, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from alsvid.db import Base
from alsvid.main import app
from alsvid.models.customer import MarketingConsentEvent
from alsvid.models.engineering import ProductPlatform
from alsvid.models.partners import BusinessPartner
from alsvid.models.service import ServiceCase, Warranty
from alsvid.models.vehicle import Vehicle, VehicleLifecycleEvent
from alsvid.services.customer_center import customer_detail, list_customers
from alsvid.services.engineering import (
    create_model,
    create_part,
    create_product,
    release_bom,
    upsert_bom_item,
)
from alsvid.services.service_center import list_service_cases, list_service_vehicles


def _engine():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return engine


def _model(db: Session):
    db.add(ProductPlatform(code="FC", name="Folding Carbon", meaning="Folding Carbon"))
    db.flush()
    product = create_product(db, code="FC1", name="FC1")
    model = create_model(
        db,
        product_id=product.id,
        platform_code="FC",
        code="FC1",
        name="FC1",
    )
    part = create_part(db, code="FC1-FRAME", name="Frame")
    upsert_bom_item(
        db,
        model_id=model.id,
        part_id=part.id,
        position_code="FRAME",
        quantity=1,
    )
    revision = release_bom(db, model_id=model.id)
    return model, revision


def test_customer_center_preserves_current_and_historical_owner_and_latest_consent() -> None:
    engine = _engine()
    with Session(engine) as db:
        model, revision = _model(db)
        dealer = BusinessPartner(
            code="DE-D-1",
            name="Berlin Dealer",
            country_code="DE",
            is_dealer=True,
        )
        former = BusinessPartner(
            code="DE-C-OLD",
            name="Former Owner",
            country_code="DE",
            email="former@example.com",
            is_customer=True,
        )
        current = BusinessPartner(
            code="DE-C-NEW",
            name="Current Owner",
            country_code="DE",
            email="current@example.com",
            is_customer=True,
        )
        db.add_all([dealer, former, current])
        db.flush()
        now = datetime.now(UTC)
        vehicle = Vehicle(
            model_id=model.id,
            frame_number="ALS-FC1-CUSTOMER-001",
            bom_revision_id=revision.id,
            build_snapshot={"model": {"code": "FC1"}},
            factory_outbound_at=now - timedelta(days=30),
            current_dealer_partner_id=dealer.id,
            current_customer_partner_id=current.id,
            purchase_date=date(2026, 10, 1),
            status="ACTIVE",
        )
        db.add(vehicle)
        db.flush()
        db.add_all(
            [
                VehicleLifecycleEvent(
                    vehicle_id=vehicle.id,
                    sequence_no=1,
                    event_type="CUSTOMER_BOUND",
                    occurred_at=now - timedelta(days=20),
                    customer_partner_id=former.id,
                ),
                VehicleLifecycleEvent(
                    vehicle_id=vehicle.id,
                    sequence_no=2,
                    event_type="OWNERSHIP_TRANSFERRED",
                    occurred_at=now - timedelta(days=5),
                    customer_partner_id=current.id,
                ),
                Warranty(
                    vehicle_id=vehicle.id,
                    start_date=date(2026, 10, 1),
                    end_date=date(2028, 10, 1),
                ),
                ServiceCase(
                    vehicle_id=vehicle.id,
                    dealer_partner_id=dealer.id,
                    issue_summary="Display check",
                    status="OPEN",
                ),
                MarketingConsentEvent(
                    partner_id=current.id,
                    channel="EMAIL",
                    status="GRANTED",
                    source="MY_ALSVID_CLAIM",
                    policy_version="2026-1",
                    occurred_at=now - timedelta(days=4),
                ),
                MarketingConsentEvent(
                    partner_id=current.id,
                    channel="EMAIL",
                    status="WITHDRAWN",
                    source="MY_ALSVID_ACCOUNT",
                    policy_version="2026-1",
                    occurred_at=now - timedelta(days=1),
                ),
            ]
        )
        db.commit()

        rows = {row["code"]: row for row in list_customers(db)}
        assert rows["DE-C-NEW"]["lifecycle_state"] == "CURRENT_OWNER"
        assert rows["DE-C-NEW"]["current_vehicle_count"] == 1
        assert rows["DE-C-NEW"]["marketing"]["email_status"] == "WITHDRAWN"
        assert rows["DE-C-NEW"]["marketing"]["eligible"] is False
        assert rows["DE-C-OLD"]["lifecycle_state"] == "FORMER_OWNER"
        assert rows["DE-C-OLD"]["previous_vehicle_count"] == 1
        assert rows["DE-C-OLD"]["marketing"]["email_status"] == "NONE"

        current_detail = customer_detail(db, partner_id=current.id)
        assert current_detail["communication_boundary"] == {
            "marketing_requires_explicit_grant": True,
            "transactional_safety_is_separate": True,
        }
        assert len(current_detail["current_vehicles"]) == 1
        assert len(current_detail["service_cases"]) == 1
        assert current_detail["consent_evidence"][0]["status"] == "WITHDRAWN"

        former_detail = customer_detail(db, partner_id=former.id)
        assert former_detail["current_vehicles"] == []
        assert former_detail["previous_vehicles"][0]["frame_number"] == vehicle.frame_number


def test_service_center_uses_canonical_vehicle_warranty_case_and_partners() -> None:
    engine = _engine()
    with Session(engine) as db:
        model, revision = _model(db)
        dealer = BusinessPartner(code="D-1", name="Dealer", is_dealer=True)
        customer = BusinessPartner(code="C-1", name="Customer", is_customer=True)
        db.add_all([dealer, customer])
        db.flush()
        vehicle = Vehicle(
            model_id=model.id,
            frame_number="ALS-FC1-SERVICE-001",
            bom_revision_id=revision.id,
            build_snapshot={"model": {"code": "FC1"}},
            current_dealer_partner_id=dealer.id,
            current_customer_partner_id=customer.id,
            status="ACTIVE",
        )
        db.add(vehicle)
        db.flush()
        db.add_all(
            [
                Warranty(
                    vehicle_id=vehicle.id,
                    start_date=date(2026, 10, 1),
                    end_date=date(2028, 10, 1),
                ),
                ServiceCase(
                    vehicle_id=vehicle.id,
                    dealer_partner_id=dealer.id,
                    issue_summary="Brake adjustment",
                    status="DIAGNOSING",
                ),
            ]
        )
        db.commit()

        vehicles = list_service_vehicles(db)
        cases = list_service_cases(db)
        assert vehicles[0]["frame_number"] == vehicle.frame_number
        assert vehicles[0]["customer"]["code"] == "C-1"
        assert vehicles[0]["dealer"]["code"] == "D-1"
        assert vehicles[0]["warranty"]["status"] == "ACTIVE"
        assert cases[0]["vehicle"]["frame_number"] == vehicle.frame_number
        assert cases[0]["status"] == "DIAGNOSING"


def test_customer_and_service_routes_are_standalone_openapi_contracts() -> None:
    paths = set(app.openapi()["paths"])
    assert "/api/v1/customer-center/customers" in paths
    assert "/api/v1/customer-center/customers/{partner_id}" in paths
    assert "/api/v1/service-center/vehicles" in paths
    assert "/api/v1/service-center/cases" in paths
