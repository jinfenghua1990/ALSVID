from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from alsvid.db import Base
from alsvid.models import BusinessPartner, Vehicle
from alsvid.services.vehicle_lifecycle import (
    VehicleEventType,
    VehicleLifecycleError,
    record_vehicle_event,
    require_retail_handover_ready,
)


def _vehicle(*, dealer_id: str | None = None) -> Vehicle:
    return Vehicle(
        id="veh_cycle",
        model_id="mdl_test",
        frame_number="ALS-CYCLE-001",
        bom_revision_id="bomr_test",
        build_snapshot={"model": {"code": "FC1"}},
        factory_outbound_at=datetime.now(UTC) - timedelta(days=1),
        current_dealer_partner_id=dealer_id,
        status="IN_TRANSIT",
    )


def test_lifecycle_rejects_wrong_partner_roles() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        supplier = BusinessPartner(
            id="bp_supplier",
            code="SUP",
            name="Supplier",
            is_supplier=True,
            is_dealer=False,
            is_customer=False,
        )
        vehicle = _vehicle(dealer_id=supplier.id)
        db.add_all([supplier, vehicle])
        db.commit()

        with pytest.raises(VehicleLifecycleError, match="authorized dealer"):
            record_vehicle_event(
                db,
                vehicle_id=vehicle.id,
                event_type=VehicleEventType.DEALER_RECEIVED,
                dealer_partner_id=supplier.id,
            )

        with pytest.raises(VehicleLifecycleError, match="customer identity"):
            record_vehicle_event(
                db,
                vehicle_id=vehicle.id,
                event_type=VehicleEventType.CUSTOMER_BOUND,
                customer_partner_id=supplier.id,
            )


def test_dealer_can_receive_again_only_after_new_transfer_cycle_and_requires_fresh_pdi() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    now = datetime.now(UTC)

    with Session(engine) as db:
        dealer_a = BusinessPartner(
            id="bp_dealer_a",
            code="DA",
            name="Dealer A",
            is_dealer=True,
        )
        dealer_b = BusinessPartner(
            id="bp_dealer_b",
            code="DB",
            name="Dealer B",
            is_dealer=True,
        )
        vehicle = _vehicle(dealer_id=dealer_a.id)
        db.add_all([dealer_a, dealer_b, vehicle])
        db.commit()

        record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.DEALER_RECEIVED,
            dealer_partner_id=dealer_a.id,
            occurred_at=now - timedelta(hours=8),
        )
        record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.PDI_COMPLETED,
            dealer_partner_id=dealer_a.id,
            occurred_at=now - timedelta(hours=7),
        )

        with pytest.raises(VehicleLifecycleError, match="current dealer custody cycle"):
            record_vehicle_event(
                db,
                vehicle_id=vehicle.id,
                event_type=VehicleEventType.DEALER_RECEIVED,
                dealer_partner_id=dealer_a.id,
                occurred_at=now - timedelta(hours=6),
            )

        record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.DEALER_TRANSFERRED,
            dealer_partner_id=dealer_b.id,
            occurred_at=now - timedelta(hours=5),
        )
        record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.DEALER_RECEIVED,
            dealer_partner_id=dealer_b.id,
            occurred_at=now - timedelta(hours=4),
        )
        record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.DEALER_TRANSFERRED,
            dealer_partner_id=dealer_a.id,
            occurred_at=now - timedelta(hours=3),
        )
        second_receipt_a = record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.DEALER_RECEIVED,
            dealer_partner_id=dealer_a.id,
            occurred_at=now - timedelta(hours=2),
        )

        assert second_receipt_a.sequence_no == 6
        with pytest.raises(VehicleLifecycleError, match="latest dealer receipt"):
            require_retail_handover_ready(
                db,
                vehicle=vehicle,
                dealer_partner_id=dealer_a.id,
            )

        new_pdi = record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.PDI_COMPLETED,
            dealer_partner_id=dealer_a.id,
            occurred_at=now - timedelta(hours=1),
        )
        receipt, pdi = require_retail_handover_ready(
            db,
            vehicle=vehicle,
            dealer_partner_id=dealer_a.id,
        )
        assert receipt.sequence_no == second_receipt_a.sequence_no
        assert pdi.sequence_no == new_pdi.sequence_no
