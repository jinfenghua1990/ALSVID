from datetime import UTC, datetime

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from alsvid.config import Settings
from alsvid.db import Base
from alsvid.models import (
    BusinessPartner,
    MyAlsvidAccount,
    Role,
    User,
    Vehicle,
    VehicleLifecycleEvent,
)
from alsvid.services.my_alsvid import (
    MyAlsvidError,
    issue_vehicle_claim_token,
    register_buyer_and_claim,
)


def _settings() -> Settings:
    return Settings(
        environment="test",
        database_url="sqlite+pysqlite:///:memory:",
        password_min_length=12,
    )


def _seed_buyer_role(db: Session) -> None:
    db.add(Role(id="role_buyer", code="ALSVID_BUYER", name="ALSVID Buyer"))


def _vehicle(*, owner_id: str | None = None, dealer_id: str | None = None) -> Vehicle:
    return Vehicle(
        id="veh_claim",
        model_id="mdl_test",
        frame_number="ALS-FC1-CLAIM",
        bom_revision_id="bomr_test",
        build_snapshot={"model": {"code": "FC1"}},
        factory_outbound_at=datetime.now(UTC),
        current_customer_partner_id=owner_id,
        current_dealer_partner_id=dealer_id,
        status="SOLD" if owner_id else "FACTORY_OUTBOUND",
    )


def test_dealer_handover_owner_can_claim_without_creating_second_customer() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        _seed_buyer_role(db)
        dealer = BusinessPartner(
            id="bp_dealer",
            code="DEALER",
            name="Dealer",
            is_dealer=True,
        )
        buyer = BusinessPartner(
            id="bp_buyer",
            code="BUYER",
            name="Retail Buyer",
            email="buyer@example.com",
            is_customer=True,
        )
        vehicle = _vehicle(owner_id=buyer.id, dealer_id=dealer.id)
        db.add_all([dealer, buyer, vehicle])
        db.commit()

        token, _ = issue_vehicle_claim_token(db, vehicle=vehicle, actor_id=None)
        user, claimed_partner, _ = register_buyer_and_claim(
            db,
            token=token,
            email="Buyer@Example.com",
            display_name="Retail Buyer",
            password="bike-owner-password",
            settings=_settings(),
        )
        db.commit()
        db.refresh(vehicle)

        assert claimed_partner.id == buyer.id
        assert vehicle.current_customer_partner_id == buyer.id
        assert db.scalar(
            select(func.count(BusinessPartner.id)).where(BusinessPartner.is_customer.is_(True))
        ) == 1
        assert db.get(MyAlsvidAccount, user.id).partner_id == buyer.id
        event_types = db.scalars(
            select(VehicleLifecycleEvent.event_type)
            .where(VehicleLifecycleEvent.vehicle_id == vehicle.id)
            .order_by(VehicleLifecycleEvent.sequence_no)
        ).all()
        assert event_types == ["ACTIVATED"]


def test_claim_email_must_match_buyer_recorded_at_handover() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        _seed_buyer_role(db)
        buyer = BusinessPartner(
            id="bp_buyer",
            code="BUYER",
            name="Retail Buyer",
            email="buyer@example.com",
            is_customer=True,
        )
        vehicle = _vehicle(owner_id=buyer.id)
        db.add_all([buyer, vehicle])
        db.commit()

        token, _ = issue_vehicle_claim_token(db, vehicle=vehicle, actor_id=None)
        with pytest.raises(MyAlsvidError, match="does not match"):
            register_buyer_and_claim(
                db,
                token=token,
                email="attacker@example.com",
                display_name="Wrong Buyer",
                password="bike-owner-password",
                settings=_settings(),
            )
        assert db.scalar(select(User.id).where(User.email == "attacker@example.com")) is None


def test_unowned_vehicle_claim_establishes_owner_then_activates() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        _seed_buyer_role(db)
        vehicle = _vehicle()
        db.add(vehicle)
        db.commit()

        token, _ = issue_vehicle_claim_token(db, vehicle=vehicle, actor_id=None)
        _, partner, _ = register_buyer_and_claim(
            db,
            token=token,
            email="first-owner@example.com",
            display_name="First Owner",
            password="bike-owner-password",
            settings=_settings(),
        )
        db.commit()
        db.refresh(vehicle)

        assert vehicle.current_customer_partner_id == partner.id
        assert vehicle.activated_at is not None
        event_types = db.scalars(
            select(VehicleLifecycleEvent.event_type)
            .where(VehicleLifecycleEvent.vehicle_id == vehicle.id)
            .order_by(VehicleLifecycleEvent.sequence_no)
        ).all()
        assert event_types == ["CUSTOMER_BOUND", "ACTIVATED"]
