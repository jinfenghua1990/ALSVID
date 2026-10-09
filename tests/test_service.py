from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from alsvid.db import Base
from alsvid.models import BusinessPartner, ServiceCase, Vehicle, VehicleLifecycleEvent
from alsvid.services.service import ServiceError, open_service_case


def _vehicle() -> Vehicle:
    return Vehicle(
        id="veh_service",
        model_id="mdl_test",
        frame_number="ALS-FC1-SERVICE",
        bom_revision_id="bomr_test",
        build_snapshot={"model": {"code": "FC1"}},
        factory_outbound_at=datetime.now(UTC),
        status="ACTIVE",
    )


def test_service_case_does_not_promote_arbitrary_partner_to_dealer() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        vehicle = _vehicle()
        supplier = BusinessPartner(
            id="bp_supplier",
            code="SUP-1",
            name="Factory Supplier",
            is_supplier=True,
            is_dealer=False,
        )
        db.add_all([vehicle, supplier])
        db.commit()

        with pytest.raises(ServiceError, match="active dealer partner"):
            open_service_case(
                db,
                vehicle_id=vehicle.id,
                dealer_partner_id=supplier.id,
                issue_summary="Brake noise",
            )
        assert supplier.is_dealer is False
        assert db.scalar(select(ServiceCase.id)) is None


def test_service_case_appends_vehicle_lifecycle_event_for_real_dealer() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        vehicle = _vehicle()
        dealer = BusinessPartner(
            id="bp_dealer_service",
            code="DEALER-1",
            name="ALSVID Dealer",
            is_dealer=True,
        )
        db.add_all([vehicle, dealer])
        db.commit()

        case = open_service_case(
            db,
            vehicle_id=vehicle.id,
            dealer_partner_id=dealer.id,
            issue_summary="Brake noise",
            priority="high",
        )
        db.commit()

        assert case.priority == "HIGH"
        lifecycle = db.scalar(
            select(VehicleLifecycleEvent).where(
                VehicleLifecycleEvent.vehicle_id == vehicle.id,
                VehicleLifecycleEvent.event_type == "SERVICE_OPENED",
            )
        )
        assert lifecycle is not None
        assert lifecycle.reference_id == case.id
