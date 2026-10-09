import secrets
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from alsvid.models.dealer import DealerPortalMember, DealerProfile
from alsvid.models.partners import BusinessPartner
from alsvid.models.vehicle import Vehicle, VehicleLifecycleEvent
from alsvid.services.vehicle_lifecycle import (
    VehicleEventType,
    VehicleLifecycleError,
    normalize_frame_number,
    record_vehicle_event,
    require_retail_handover_ready,
)


class DealerPortalError(ValueError):
    pass


def dealer_for_user(db: Session, *, user_id: str) -> tuple[DealerProfile, BusinessPartner]:
    rows = db.execute(
        select(DealerProfile, BusinessPartner)
        .join(DealerPortalMember, DealerPortalMember.dealer_partner_id == DealerProfile.partner_id)
        .join(BusinessPartner, BusinessPartner.id == DealerProfile.partner_id)
        .where(DealerPortalMember.user_id == user_id, DealerPortalMember.active.is_(True))
    ).all()
    usable = [
        (profile, partner)
        for profile, partner in rows
        if partner.active
        and partner.is_dealer
        and profile.authorization_status.strip().upper() == "APPROVED"
    ]
    if len(usable) != 1:
        raise DealerPortalError("user must have exactly one active approved dealer assignment")
    return usable[0]


def dealer_vehicle(
    db: Session,
    *,
    frame_number: str,
    dealer_partner_id: str,
    for_update: bool = False,
) -> Vehicle:
    statement = select(Vehicle).where(
        Vehicle.frame_number == normalize_frame_number(frame_number),
        Vehicle.current_dealer_partner_id == dealer_partner_id,
    )
    if for_update:
        statement = statement.with_for_update()
    vehicle = db.scalar(statement)
    if vehicle is None:
        raise DealerPortalError("vehicle not found in this dealer account")
    return vehicle


def record_dealer_receipt(
    db: Session,
    *,
    frame_number: str,
    dealer_partner_id: str,
    actor_id: str,
    reference: str = "",
    occurred_at: datetime | None = None,
) -> VehicleLifecycleEvent:
    vehicle = dealer_vehicle(
        db,
        frame_number=frame_number,
        dealer_partner_id=dealer_partner_id,
        for_update=True,
    )
    try:
        return record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.DEALER_RECEIVED,
            actor_id=actor_id,
            dealer_partner_id=dealer_partner_id,
            reference_type="DEALER_RECEIPT",
            reference_id=reference.strip() or None,
            occurred_at=occurred_at or datetime.now(UTC),
            event_data={"receipt_reference": reference.strip()},
        )
    except VehicleLifecycleError as exc:
        raise DealerPortalError(str(exc)) from exc


def complete_dealer_pdi(
    db: Session,
    *,
    frame_number: str,
    dealer_partner_id: str,
    actor_id: str,
    checks: dict[str, bool],
    note: str = "",
    occurred_at: datetime | None = None,
) -> VehicleLifecycleEvent:
    if not checks or not all(value is True for value in checks.values()):
        raise DealerPortalError("all PDI checks must pass")
    vehicle = dealer_vehicle(
        db,
        frame_number=frame_number,
        dealer_partner_id=dealer_partner_id,
        for_update=True,
    )
    try:
        return record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.PDI_COMPLETED,
            actor_id=actor_id,
            dealer_partner_id=dealer_partner_id,
            reference_type="PDI",
            occurred_at=occurred_at or datetime.now(UTC),
            note=note,
            event_data={"checks": checks},
        )
    except VehicleLifecycleError as exc:
        raise DealerPortalError(str(exc)) from exc


def _buyer_partner(
    db: Session,
    *,
    email: str,
    display_name: str,
    phone: str,
) -> BusinessPartner:
    normalized_email = email.strip().lower()
    if not normalized_email:
        raise DealerPortalError("buyer email is required")
    normalized_name = display_name.strip()
    if not normalized_name:
        raise DealerPortalError("buyer name is required")

    matches = db.scalars(
        select(BusinessPartner).where(func.lower(BusinessPartner.email) == normalized_email)
    ).all()
    if len(matches) > 1:
        raise DealerPortalError("buyer email matches multiple contacts; ALSVID support must verify it")
    if matches:
        partner = matches[0]
        if not partner.active or not partner.is_customer:
            raise DealerPortalError(
                "buyer email is linked to a non-customer contact; ALSVID support must verify it"
            )
        if not partner.phone and phone.strip():
            partner.phone = phone.strip()
        return partner

    partner = BusinessPartner(
        code=f"ALSVID-BUYER-{secrets.token_hex(8).upper()}",
        name=normalized_name,
        email=normalized_email,
        phone=phone.strip() or None,
        is_customer=True,
    )
    db.add(partner)
    db.flush()
    return partner


def dealer_handover(
    db: Session,
    *,
    frame_number: str,
    dealer_partner_id: str,
    actor_id: str,
    buyer_name: str,
    buyer_email: str,
    purchase_date: date,
    buyer_phone: str = "",
    occurred_at: datetime | None = None,
) -> tuple[Vehicle, VehicleLifecycleEvent]:
    vehicle = dealer_vehicle(
        db,
        frame_number=frame_number,
        dealer_partner_id=dealer_partner_id,
        for_update=True,
    )
    if vehicle.current_customer_partner_id is not None:
        raise DealerPortalError("vehicle already has a buyer")

    event_time = occurred_at or datetime.now(UTC)
    if purchase_date > event_time.date():
        raise DealerPortalError("purchase date cannot be in the future")

    try:
        _, latest_pdi = require_retail_handover_ready(
            db,
            vehicle=vehicle,
            dealer_partner_id=dealer_partner_id,
        )
    except VehicleLifecycleError as exc:
        raise DealerPortalError(str(exc)) from exc
    if event_time < latest_pdi.occurred_at:
        raise DealerPortalError("handover cannot precede PDI")

    customer = _buyer_partner(
        db,
        email=buyer_email,
        display_name=buyer_name,
        phone=buyer_phone,
    )
    vehicle.purchase_date = purchase_date
    try:
        event = record_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.RETAIL_SOLD,
            actor_id=actor_id,
            dealer_partner_id=dealer_partner_id,
            customer_partner_id=customer.id,
            occurred_at=event_time,
            reference_type="DEALER_HANDOVER",
            event_data={"purchase_date": purchase_date.isoformat()},
        )
    except VehicleLifecycleError as exc:
        raise DealerPortalError(str(exc)) from exc
    return vehicle, event
