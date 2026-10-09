from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from alsvid.db import Base
from alsvid.models import BusinessPartner, Vehicle, VehicleLifecycleEvent
from alsvid.services.dealer_portal import (
    DealerPortalError,
    complete_dealer_pdi,
    dealer_handover,
    dealer_vehicle,
    record_dealer_receipt,
)


def _seed_vehicle(db: Session) -> tuple[Vehicle, BusinessPartner, BusinessPartner]:
    dealer_a = BusinessPartner(
        id="bp_dealer_a",
        code="DEALER-A",
        name="Dealer A",
        is_dealer=True,
    )
    dealer_b = BusinessPartner(
        id="bp_dealer_b",
        code="DEALER-B",
        name="Dealer B",
        is_dealer=True,
    )
    outbound_at = datetime.now(UTC) - timedelta(days=1)
    vehicle = Vehicle(
        id="veh_dealer",
        model_id="mdl_test",
        frame_number="ALS-DEALER-001",
        bom_revision_id="bomr_test",
        build_snapshot={"model": {"code": "FC1"}},
        factory_outbound_at=outbound_at,
        current_dealer_partner_id=dealer_a.id,
        status="IN_TRANSIT",
    )
    db.add_all([dealer_a, dealer_b, vehicle])
    db.add(
        VehicleLifecycleEvent(
            id="vev_factory",
            vehicle_id=vehicle.id,
            sequence_no=1,
            event_type="FACTORY_OUTBOUND",
            occurred_at=outbound_at,
            event_data={},
        )
    )
    db.commit()
    return vehicle, dealer_a, dealer_b


def test_dealer_scope_rejects_guessed_vehicle() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        vehicle, _, dealer_b = _seed_vehicle(db)
        with pytest.raises(DealerPortalError, match="not found in this dealer account"):
            dealer_vehicle(
                db,
                frame_number=vehicle.frame_number,
                dealer_partner_id=dealer_b.id,
            )


def test_receive_pdi_handover_reuses_vehicle_and_validates_before_buyer_creation() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        vehicle, dealer, _ = _seed_vehicle(db)
        received_at = datetime.now(UTC) - timedelta(hours=3)
        pdi_at = datetime.now(UTC) - timedelta(hours=2)

        record_dealer_receipt(
            db,
            frame_number=vehicle.frame_number,
            dealer_partner_id=dealer.id,
            actor_id="usr_dealer",
            occurred_at=received_at,
        )
        with pytest.raises(DealerPortalError, match="all PDI checks must pass"):
            complete_dealer_pdi(
                db,
                frame_number=vehicle.frame_number,
                dealer_partner_id=dealer.id,
                actor_id="usr_dealer",
                checks={"brakes": False},
            )
        complete_dealer_pdi(
            db,
            frame_number=vehicle.frame_number,
            dealer_partner_id=dealer.id,
            actor_id="usr_dealer",
            checks={"brakes": True, "lights": True},
            occurred_at=pdi_at,
        )

        before_customers = db.scalar(
            select(func.count(BusinessPartner.id)).where(BusinessPartner.is_customer.is_(True))
        )
        with pytest.raises(DealerPortalError, match="handover cannot precede PDI"):
            dealer_handover(
                db,
                frame_number=vehicle.frame_number,
                dealer_partner_id=dealer.id,
                actor_id="usr_dealer",
                buyer_name="Retail Buyer",
                buyer_email="retail@example.com",
                purchase_date=date.today(),
                occurred_at=pdi_at - timedelta(minutes=1),
            )
        after_failed_customers = db.scalar(
            select(func.count(BusinessPartner.id)).where(BusinessPartner.is_customer.is_(True))
        )
        assert after_failed_customers == before_customers

        dealer_handover(
            db,
            frame_number=vehicle.frame_number,
            dealer_partner_id=dealer.id,
            actor_id="usr_dealer",
            buyer_name="Retail Buyer",
            buyer_email="retail@example.com",
            buyer_phone="123",
            purchase_date=date.today(),
            occurred_at=datetime.now(UTC),
        )
        db.commit()
        db.refresh(vehicle)

        assert vehicle.current_customer_partner_id is not None
        assert db.scalar(select(func.count(Vehicle.id))) == 1
        event_types = db.scalars(
            select(VehicleLifecycleEvent.event_type)
            .where(VehicleLifecycleEvent.vehicle_id == vehicle.id)
            .order_by(VehicleLifecycleEvent.sequence_no)
        ).all()
        assert event_types == [
            "FACTORY_OUTBOUND",
            "DEALER_RECEIVED",
            "PDI_COMPLETED",
            "RETAIL_SOLD",
        ]
