from enum import StrEnum

from sqlalchemy import select
from sqlalchemy.orm import Session

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


def normalize_frame_number(value: str) -> str:
    frame_number = value.strip().upper()
    if not frame_number:
        raise VehicleLifecycleError("frame number is required")
    return frame_number


def latest_vehicle_event(
    db: Session,
    *,
    vehicle_id: str,
    event_type: VehicleEventType | str,
    dealer_partner_id: str | None = None,
) -> VehicleLifecycleEvent | None:
    """Return the latest matching event deterministically.

    The source monolith had at least one handover path that called a PDI row
    `latest_pdi` without ordering the query. This helper is the only supported
    way to resolve the latest lifecycle event in the standalone codebase.
    """

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
