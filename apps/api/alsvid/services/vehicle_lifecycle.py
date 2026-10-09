from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from alsvid.ids import new_id
from alsvid.models.catalog import SKU
from alsvid.models.core import AuditEvent
from alsvid.models.engineering import BicycleModel, BicycleVariant, BomRevision
from alsvid.models.partners import BusinessPartner
from alsvid.models.vehicle import Vehicle, VehicleLifecycleEvent


class VehicleLifecycleError(ValueError):
    pass


class VehicleEventType(StrEnum):
    FACTORY_REGISTERED = "FACTORY_REGISTERED"
    FACTORY_OUTBOUND = "FACTORY_OUTBOUND"
    IN_TRANSIT = "IN_TRANSIT"
    WAREHOUSE_RECEIVED = "WAREHOUSE_RECEIVED"
    DEALER_RECEIVED = "DEALER_RECEIVED"
    DEALER_TRANSFERRED = "DEALER_TRANSFERRED"
    PDI_COMPLETED = "PDI_COMPLETED"
    RETAIL_SOLD = "RETAIL_SOLD"
    CUSTOMER_BOUND = "CUSTOMER_BOUND"
    ACTIVATED = "ACTIVATED"
    WARRANTY_STARTED = "WARRANTY_STARTED"
    SERVICE_OPENED = "SERVICE_OPENED"
    SERVICE_COMPLETED = "SERVICE_COMPLETED"
    COMPONENT_REPLACED = "COMPONENT_REPLACED"
    OWNERSHIP_TRANSFERRED = "OWNERSHIP_TRANSFERRED"
    LOST_REPORTED = "LOST_REPORTED"
    STOLEN_REPORTED = "STOLEN_REPORTED"
    RECOVERED = "RECOVERED"
    RECALL_AFFECTED = "RECALL_AFFECTED"
    RECALL_REMEDIATED = "RECALL_REMEDIATED"


_STATUS_BY_EVENT: dict[VehicleEventType, str] = {
    VehicleEventType.FACTORY_REGISTERED: "REGISTERED",
    VehicleEventType.FACTORY_OUTBOUND: "FACTORY_OUTBOUND",
    VehicleEventType.IN_TRANSIT: "IN_TRANSIT",
    VehicleEventType.WAREHOUSE_RECEIVED: "WAREHOUSE",
    VehicleEventType.DEALER_RECEIVED: "DEALER_STOCK",
    VehicleEventType.DEALER_TRANSFERRED: "DEALER_STOCK",
    VehicleEventType.PDI_COMPLETED: "READY_FOR_SALE",
    VehicleEventType.RETAIL_SOLD: "SOLD",
    VehicleEventType.CUSTOMER_BOUND: "SOLD",
    VehicleEventType.ACTIVATED: "ACTIVE",
    VehicleEventType.OWNERSHIP_TRANSFERRED: "ACTIVE",
    VehicleEventType.LOST_REPORTED: "LOST",
    VehicleEventType.STOLEN_REPORTED: "STOLEN",
    VehicleEventType.RECOVERED: "ACTIVE",
}

_FACTORY_EVENTS = {VehicleEventType.FACTORY_REGISTERED, VehicleEventType.FACTORY_OUTBOUND}
_DEALER_REQUIRED_EVENTS = {
    VehicleEventType.DEALER_RECEIVED,
    VehicleEventType.DEALER_TRANSFERRED,
    VehicleEventType.PDI_COMPLETED,
    VehicleEventType.RETAIL_SOLD,
}
_CUSTOMER_REQUIRED_EVENTS = {
    VehicleEventType.RETAIL_SOLD,
    VehicleEventType.CUSTOMER_BOUND,
    VehicleEventType.OWNERSHIP_TRANSFERRED,
}


def normalize_frame_number(value: str) -> str:
    frame_number = value.strip().upper()
    if not frame_number:
        raise VehicleLifecycleError("frame number is required")
    return frame_number


def _require_partner(
    db: Session,
    partner_id: str | None,
    *,
    label: str,
) -> BusinessPartner | None:
    if partner_id is None:
        return None
    partner = db.get(BusinessPartner, partner_id)
    if partner is None or not partner.active:
        raise VehicleLifecycleError(f"{label} partner not found or inactive")
    return partner


def _validate_variant(db: Session, *, model: BicycleModel, sku_id: str | None) -> SKU | None:
    if sku_id is None:
        return None
    sku = db.get(SKU, sku_id)
    if sku is None or not sku.active:
        raise VehicleLifecycleError("vehicle SKU not found or inactive")
    variant = db.scalar(
        select(BicycleVariant).where(
            BicycleVariant.model_id == model.id,
            BicycleVariant.sku_id == sku.id,
            BicycleVariant.status == "ACTIVE",
        )
    )
    if variant is None:
        raise VehicleLifecycleError("vehicle SKU is not an active model variant")
    return sku


def _resolve_bom_revision(
    db: Session,
    *,
    model: BicycleModel,
    bom_revision_id: str | None,
) -> BomRevision:
    if bom_revision_id is not None:
        revision = db.get(BomRevision, bom_revision_id)
        if revision is None or revision.model_id != model.id or revision.status != "RELEASED":
            raise VehicleLifecycleError("released BOM revision does not belong to vehicle model")
        return revision

    revision = db.scalar(
        select(BomRevision)
        .where(BomRevision.model_id == model.id, BomRevision.status == "RELEASED")
        .order_by(BomRevision.revision_no.desc())
        .limit(1)
    )
    if revision is None:
        raise VehicleLifecycleError("vehicle requires a released BOM revision")
    return revision


def _build_snapshot(
    *,
    model: BicycleModel,
    sku: SKU | None,
    revision: BomRevision,
    production_batch: str | None,
    factory_source: str | None,
) -> dict:
    return {
        "model": {
            "id": model.id,
            "code": model.code,
            "name": model.name,
            "generation": model.generation,
        },
        "sku": {"id": sku.id, "code": sku.code, "name": sku.name} if sku is not None else None,
        "bom_revision": {
            "id": revision.id,
            "revision_no": revision.revision_no,
            "checksum": revision.checksum,
            "snapshot": revision.snapshot,
        },
        "production_batch": production_batch,
        "factory_source": factory_source,
    }


def latest_vehicle_event(
    db: Session,
    *,
    vehicle_id: str,
    event_type: VehicleEventType | str,
    dealer_partner_id: str | None = None,
) -> VehicleLifecycleEvent | None:
    """Return the latest matching event deterministically by sequence number."""

    normalized_type = VehicleEventType(event_type).value
    statement = select(VehicleLifecycleEvent).where(
        VehicleLifecycleEvent.vehicle_id == vehicle_id,
        VehicleLifecycleEvent.event_type == normalized_type,
    )
    if dealer_partner_id is not None:
        statement = statement.where(VehicleLifecycleEvent.dealer_partner_id == dealer_partner_id)
    statement = statement.order_by(VehicleLifecycleEvent.sequence_no.desc()).limit(1)
    return db.scalar(statement)


def require_retail_handover_ready(
    db: Session,
    *,
    vehicle: Vehicle,
    dealer_partner_id: str,
) -> tuple[VehicleLifecycleEvent, VehicleLifecycleEvent]:
    """Validate the latest dealer receipt -> PDI chain before retail handover."""

    if vehicle.current_dealer_partner_id != dealer_partner_id:
        raise VehicleLifecycleError("handover must be recorded by the dealer holding the vehicle")
    if vehicle.current_customer_partner_id is not None:
        raise VehicleLifecycleError("vehicle has already been bound to a customer")

    latest_receipt = latest_vehicle_event(
        db,
        vehicle_id=vehicle.id,
        event_type=VehicleEventType.DEALER_RECEIVED,
        dealer_partner_id=dealer_partner_id,
    )
    if latest_receipt is None:
        raise VehicleLifecycleError("vehicle must be received before handover")

    latest_pdi = latest_vehicle_event(
        db,
        vehicle_id=vehicle.id,
        event_type=VehicleEventType.PDI_COMPLETED,
        dealer_partner_id=dealer_partner_id,
    )
    if latest_pdi is None or latest_pdi.sequence_no < latest_receipt.sequence_no:
        raise VehicleLifecycleError("complete PDI after the latest dealer receipt before handover")
    if latest_pdi.occurred_at < latest_receipt.occurred_at:
        raise VehicleLifecycleError("PDI cannot precede the latest dealer receipt")
    return latest_receipt, latest_pdi


def record_vehicle_event(
    db: Session,
    *,
    vehicle_id: str,
    event_type: VehicleEventType | str,
    occurred_at: datetime | None = None,
    actor_id: str | None = None,
    dealer_partner_id: str | None = None,
    customer_partner_id: str | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
    note: str = "",
    event_data: dict | None = None,
) -> VehicleLifecycleEvent:
    vehicle = db.scalar(select(Vehicle).where(Vehicle.id == vehicle_id).with_for_update())
    if vehicle is None:
        raise VehicleLifecycleError("vehicle not found")

    normalized_type = VehicleEventType(event_type)
    if (
        normalized_type not in _FACTORY_EVENTS
        and vehicle.build_snapshot
        and vehicle.factory_outbound_at is None
    ):
        raise VehicleLifecycleError("vehicle requires factory outbound before downstream events")

    dealer = _require_partner(db, dealer_partner_id, label="dealer")
    customer = _require_partner(db, customer_partner_id, label="customer")
    if normalized_type in _DEALER_REQUIRED_EVENTS and dealer is None:
        raise VehicleLifecycleError("lifecycle event requires dealer partner")
    if normalized_type in _CUSTOMER_REQUIRED_EVENTS and customer is None:
        raise VehicleLifecycleError("lifecycle event requires customer partner")

    if normalized_type == VehicleEventType.DEALER_RECEIVED:
        if vehicle.factory_outbound_at is None:
            raise VehicleLifecycleError("vehicle requires factory outbound before dealer receipt")
        if vehicle.current_dealer_partner_id not in {None, dealer.id}:
            raise VehicleLifecycleError("vehicle is assigned to another dealer")
        if vehicle.current_customer_partner_id is not None:
            raise VehicleLifecycleError("sold vehicle cannot be received into dealer stock")
        prior_receipt = latest_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.DEALER_RECEIVED,
            dealer_partner_id=dealer.id,
        )
        if prior_receipt is not None:
            raise VehicleLifecycleError("vehicle was already received by this dealer")

    if normalized_type == VehicleEventType.PDI_COMPLETED:
        if vehicle.current_dealer_partner_id != dealer.id:
            raise VehicleLifecycleError("PDI must be recorded by the dealer holding the vehicle")
        latest_receipt = latest_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.DEALER_RECEIVED,
            dealer_partner_id=dealer.id,
        )
        if latest_receipt is None:
            raise VehicleLifecycleError("vehicle must be received before PDI")
        previous_pdi = latest_vehicle_event(
            db,
            vehicle_id=vehicle.id,
            event_type=VehicleEventType.PDI_COMPLETED,
            dealer_partner_id=dealer.id,
        )
        if previous_pdi is not None and previous_pdi.sequence_no > latest_receipt.sequence_no:
            raise VehicleLifecycleError("PDI was already completed after the latest receipt")
        if occurred_at is not None and occurred_at < latest_receipt.occurred_at:
            raise VehicleLifecycleError("PDI cannot precede dealer receipt")

    if normalized_type == VehicleEventType.RETAIL_SOLD:
        _, latest_pdi = require_retail_handover_ready(
            db,
            vehicle=vehicle,
            dealer_partner_id=dealer.id,
        )
        if occurred_at is not None and occurred_at < latest_pdi.occurred_at:
            raise VehicleLifecycleError("handover cannot precede PDI")

    max_sequence = db.scalar(
        select(func.coalesce(func.max(VehicleLifecycleEvent.sequence_no), 0)).where(
            VehicleLifecycleEvent.vehicle_id == vehicle.id
        )
    )
    event = VehicleLifecycleEvent(
        id=new_id("vehicle_event"),
        vehicle_id=vehicle.id,
        sequence_no=int(max_sequence or 0) + 1,
        event_type=normalized_type.value,
        occurred_at=occurred_at or datetime.now(UTC),
        actor_id=actor_id,
        dealer_partner_id=dealer.id if dealer is not None else None,
        customer_partner_id=customer.id if customer is not None else None,
        reference_type=(reference_type or "").strip().upper() or None,
        reference_id=(reference_id or "").strip() or None,
        note=note.strip(),
        event_data=event_data or {},
    )
    db.add(event)

    if normalized_type in {VehicleEventType.DEALER_RECEIVED, VehicleEventType.DEALER_TRANSFERRED}:
        vehicle.current_dealer_partner_id = dealer.id
    if normalized_type in {
        VehicleEventType.RETAIL_SOLD,
        VehicleEventType.CUSTOMER_BOUND,
        VehicleEventType.OWNERSHIP_TRANSFERRED,
    }:
        vehicle.current_customer_partner_id = customer.id
    if normalized_type == VehicleEventType.ACTIVATED and vehicle.activated_at is None:
        vehicle.activated_at = event.occurred_at

    status = _STATUS_BY_EVENT.get(normalized_type)
    if status is not None:
        vehicle.status = status

    db.add(
        AuditEvent(
            actor_id=actor_id,
            action=f"alsvid.vehicle.{normalized_type.value.lower()}",
            entity_type="vehicle",
            entity_id=vehicle.id,
        )
    )
    db.flush()
    return event


def register_vehicle(
    db: Session,
    *,
    model_id: str,
    frame_number: str,
    sku_id: str | None = None,
    bom_revision_id: str | None = None,
    production_batch: str | None = None,
    factory_source: str | None = None,
    production_completed_at: datetime | None = None,
    registered_at: datetime | None = None,
    actor_id: str | None = None,
) -> Vehicle:
    frame = normalize_frame_number(frame_number)
    if db.scalar(select(Vehicle.id).where(func.upper(Vehicle.frame_number) == frame)) is not None:
        raise VehicleLifecycleError("frame number already exists")

    model = db.get(BicycleModel, model_id)
    if model is None:
        raise VehicleLifecycleError("ALSVID bicycle model not found")
    sku = _validate_variant(db, model=model, sku_id=sku_id)
    revision = _resolve_bom_revision(db, model=model, bom_revision_id=bom_revision_id)
    batch = (production_batch or "").strip() or None
    factory = (factory_source or "").strip() or None

    vehicle = Vehicle(
        id=new_id("vehicle"),
        model_id=model.id,
        frame_number=frame,
        sku_id=sku.id if sku is not None else None,
        bom_revision_id=revision.id,
        build_snapshot=_build_snapshot(
            model=model,
            sku=sku,
            revision=revision,
            production_batch=batch,
            factory_source=factory,
        ),
        production_batch=batch,
        factory_source=factory,
        production_completed_at=production_completed_at,
        status="REGISTERED",
    )
    db.add(vehicle)
    db.flush()
    record_vehicle_event(
        db,
        vehicle_id=vehicle.id,
        event_type=VehicleEventType.FACTORY_REGISTERED,
        occurred_at=registered_at or production_completed_at or datetime.now(UTC),
        actor_id=actor_id,
        event_data={
            "bom_revision_id": revision.id,
            "bom_revision_no": revision.revision_no,
            "production_batch": batch,
            "factory_source": factory,
        },
    )
    return vehicle


def record_factory_outbound(
    db: Session,
    *,
    vehicle_id: str,
    factory_outbound_at: datetime,
    reference: str | None = None,
    actor_id: str | None = None,
) -> VehicleLifecycleEvent:
    vehicle = db.scalar(select(Vehicle).where(Vehicle.id == vehicle_id).with_for_update())
    if vehicle is None:
        raise VehicleLifecycleError("vehicle not found")
    if vehicle.factory_outbound_at is not None:
        raise VehicleLifecycleError("vehicle factory outbound already recorded")
    if vehicle.production_completed_at is not None and vehicle.production_completed_at > factory_outbound_at:
        raise VehicleLifecycleError("production completion cannot be after factory outbound")
    if not vehicle.build_snapshot or not vehicle.bom_revision_id:
        raise VehicleLifecycleError("vehicle requires frozen build evidence before factory outbound")

    vehicle.factory_outbound_at = factory_outbound_at
    vehicle.factory_outbound_reference = (reference or "").strip() or None
    return record_vehicle_event(
        db,
        vehicle_id=vehicle.id,
        event_type=VehicleEventType.FACTORY_OUTBOUND,
        occurred_at=factory_outbound_at,
        actor_id=actor_id,
        reference_type="FACTORY_OUTBOUND",
        reference_id=vehicle.factory_outbound_reference,
        event_data={
            "production_batch": vehicle.production_batch,
            "factory_source": vehicle.factory_source,
        },
    )
