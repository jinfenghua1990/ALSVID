from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from alsvid.db import Base
from alsvid.models import Vehicle, VehicleLifecycleEvent
from alsvid.services.vehicle_lifecycle import (
    VehicleEventType,
    VehicleLifecycleError,
    latest_vehicle_event,
    require_retail_handover_ready,
)


def _event(
    *,
    vehicle_id: str,
    sequence_no: int,
    event_type: str,
    dealer_partner_id: str,
    occurred_at: datetime,
) -> VehicleLifecycleEvent:
    return VehicleLifecycleEvent(
        vehicle_id=vehicle_id,
        sequence_no=sequence_no,
        event_type=event_type,
        dealer_partner_id=dealer_partner_id,
        occurred_at=occurred_at,
    )


def test_latest_event_is_selected_by_sequence_not_database_row_order() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    now = datetime.now(UTC)

    with Session(engine) as db:
        vehicle = Vehicle(
            id="veh_test",
            model_id="mdl_test",
            frame_number="ALS-FC1-TEST",
            bom_revision_id="bomr_test",
            current_dealer_partner_id="bp_dealer",
            build_snapshot={"model": {"code": "FC1"}},
        )
        db.add(vehicle)
        db.add_all(
            [
                _event(
                    vehicle_id=vehicle.id,
                    sequence_no=2,
                    event_type=VehicleEventType.PDI_COMPLETED.value,
                    dealer_partner_id="bp_dealer",
                    occurred_at=now - timedelta(days=2),
                ),
                _event(
                    vehicle_id=vehicle.id,
                    sequence_no=5,
                    event_type=VehicleEventType.DEALER_RECEIVED.value,
                    dealer_partner_id="bp_dealer",
                    occurred_at=now - timedelta(hours=2),
                ),
                _event(
                    vehicle_id=vehicle.id,
                    sequence_no=6,
                    event_type=VehicleEventType.PDI_COMPLETED.value,
                    dealer_partner_id="bp_dealer",
                    occurred_at=now - timedelta(hours=1),
                ),
            ]
        )
        db.commit()

        latest_pdi = latest_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.PDI_COMPLETED,
            dealer_partner_id="bp_dealer",
        )
        assert latest_pdi is not None
        assert latest_pdi.sequence_no == 6

        latest_receipt, validated_pdi = require_retail_handover_ready(
            db,
            vehicle=vehicle,
            dealer_partner_id="bp_dealer",
        )
        assert latest_receipt.sequence_no == 5
        assert validated_pdi.sequence_no == 6


def test_handover_requires_pdi_after_latest_receipt() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    now = datetime.now(UTC)

    with Session(engine) as db:
        vehicle = Vehicle(
            id="veh_test_2",
            model_id="mdl_test",
            frame_number="ALS-FC1-TEST-2",
            bom_revision_id="bomr_test",
            current_dealer_partner_id="bp_dealer",
            build_snapshot={"model": {"code": "FC1"}},
        )
        db.add(vehicle)
        db.add_all(
            [
                _event(
                    vehicle_id=vehicle.id,
                    sequence_no=6,
                    event_type=VehicleEventType.PDI_COMPLETED.value,
                    dealer_partner_id="bp_dealer",
                    occurred_at=now - timedelta(hours=2),
                ),
                _event(
                    vehicle_id=vehicle.id,
                    sequence_no=7,
                    event_type=VehicleEventType.DEALER_RECEIVED.value,
                    dealer_partner_id="bp_dealer",
                    occurred_at=now - timedelta(hours=1),
                ),
            ]
        )
        db.commit()

        with pytest.raises(VehicleLifecycleError, match="latest dealer receipt"):
            require_retail_handover_ready(
                db,
                vehicle=vehicle,
                dealer_partner_id="bp_dealer",
            )
