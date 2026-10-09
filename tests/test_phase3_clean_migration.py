from datetime import UTC, date, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from alsvid.db import Base
from alsvid.main import app
from alsvid.models.engineering import ProductPlatform
from alsvid.models.partners import BusinessPartner
from alsvid.models.service import ServiceCase, Warranty
from alsvid.models.vehicle import Vehicle, VehicleLifecycleEvent
from alsvid.services.engineering import (
    create_model,
    create_part,
    create_product,
    register_asset,
    release_bom,
    upsert_bom_item,
)
from alsvid.services.vehicle_center import list_vehicles, vehicle_360
from alsvid.services.vehicle_lifecycle import (
    VehicleEventType,
    VehicleLifecycleError,
    record_vehicle_event,
)


def _engine():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return engine


def _engineering_fixture(db: Session):
    db.add(ProductPlatform(code="FC", name="Folding Carbon", meaning="Folding Carbon"))
    db.flush()
    product = create_product(db, code="FC1", name="FC1")
    model = create_model(
        db,
        product_id=product.id,
        platform_code="FC",
        code="FC1",
        name="FC1",
        frame_material="Carbon",
        wheel_size="20",
        motor_position="MID",
    )
    part = create_part(db, code="FC1-FRAME", name="Carbon frame")
    upsert_bom_item(
        db,
        model_id=model.id,
        part_id=part.id,
        position_code="FRAME",
        quantity=1,
    )
    revision = release_bom(db, model_id=model.id)
    return product, model, part, revision


def test_bom_release_is_idempotent_and_assets_use_standalone_owner() -> None:
    engine = _engine()
    with Session(engine) as db:
        _product, model, _part, revision = _engineering_fixture(db)
        same_revision = release_bom(db, model_id=model.id)
        assert same_revision.id == revision.id
        assert same_revision.revision_no == 1
        assert len(revision.checksum) == 64

        asset = register_asset(
            db,
            owner_type="MODEL",
            owner_id=model.id,
            asset_type="MODEL_3D",
            storage_key=f"alsvid/model/{model.id}/fc1.glb",
            visibility="PUBLIC",
            file_name="fc1.glb",
            mime_type="model/gltf-binary",
        )
        db.flush()
        assert asset.owner_id == model.id
        assert asset.storage_key.startswith(f"alsvid/model/{model.id}/")


def test_every_downstream_event_requires_factory_outbound_even_with_empty_snapshot() -> None:
    engine = _engine()
    with Session(engine) as db:
        vehicle = Vehicle(
            id="veh_malformed",
            model_id="mdl_missing",
            frame_number="ALS-MALFORMED-001",
            bom_revision_id="bom_missing",
            build_snapshot={},
            status="REGISTERED",
        )
        db.add(vehicle)
        db.flush()

        for event_type in (
            VehicleEventType.IN_TRANSIT,
            VehicleEventType.WAREHOUSE_RECEIVED,
            VehicleEventType.WARRANTY_STARTED,
            VehicleEventType.SERVICE_OPENED,
            VehicleEventType.RECALL_AFFECTED,
        ):
            with pytest.raises(VehicleLifecycleError, match="factory outbound"):
                record_vehicle_event(db, vehicle_id=vehicle.id, event_type=event_type)

        assert db.query(VehicleLifecycleEvent).filter_by(vehicle_id=vehicle.id).count() == 0


def test_vehicle_360_projects_birth_custody_warranty_service_and_timeline() -> None:
    engine = _engine()
    with Session(engine) as db:
        _product, model, _part, revision = _engineering_fixture(db)
        dealer = BusinessPartner(
            code="DE-DEALER-1",
            name="Berlin Dealer",
            country_code="DE",
            is_dealer=True,
        )
        customer = BusinessPartner(
            code="DE-CUSTOMER-1",
            name="Customer",
            country_code="DE",
            is_customer=True,
        )
        db.add_all([dealer, customer])
        db.flush()
        now = datetime.now(UTC)
        vehicle = Vehicle(
            model_id=model.id,
            frame_number="ALS-FC1-000001",
            bom_revision_id=revision.id,
            build_snapshot={"model": {"code": "FC1"}, "bom_revision": {"revision_no": 1}},
            production_batch="202610-01",
            factory_source="CN-FACTORY",
            factory_outbound_at=now,
            current_dealer_partner_id=dealer.id,
            current_customer_partner_id=customer.id,
            purchase_date=date(2026, 10, 9),
            status="ACTIVE",
        )
        db.add(vehicle)
        db.flush()
        db.add_all(
            [
                VehicleLifecycleEvent(
                    vehicle_id=vehicle.id,
                    sequence_no=1,
                    event_type="FACTORY_REGISTERED",
                    occurred_at=now,
                ),
                VehicleLifecycleEvent(
                    vehicle_id=vehicle.id,
                    sequence_no=2,
                    event_type="FACTORY_OUTBOUND",
                    occurred_at=now,
                ),
                Warranty(
                    vehicle_id=vehicle.id,
                    start_date=date(2026, 10, 9),
                    end_date=date(2028, 10, 9),
                ),
                ServiceCase(
                    vehicle_id=vehicle.id,
                    dealer_partner_id=dealer.id,
                    issue_summary="Brake adjustment",
                    status="OPEN",
                ),
            ]
        )
        db.commit()

        rows = list_vehicles(db, q="berlin", attention_only=True)
        assert len(rows) == 1
        assert rows[0]["needs_attention"] is True
        assert rows[0]["current_dealer"]["name"] == "Berlin Dealer"

        detail = vehicle_360(db, frame_number="als-fc1-000001")
        assert detail["birth"]["production_batch"] == "202610-01"
        assert detail["warranty"]["status"] == "ACTIVE"
        assert len(detail["service_cases"]) == 1
        assert [event["sequence_no"] for event in detail["lifecycle"]] == [1, 2]


def test_phase3_routes_are_first_class_standalone_routes() -> None:
    paths = set(app.openapi()["paths"])
    assert "/api/v1/product-center/models" in paths
    assert "/api/v1/assets/upload-ticket" in paths
    assert "/api/v1/vehicle-center/vehicles" in paths
    assert "/api/v1/vehicle-center/vehicles/{vehicle_id}" in paths
