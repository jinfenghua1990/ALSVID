from sqlalchemy.orm import Session

from alsvid.ids import new_id
from alsvid.models.core import AuditEvent
from alsvid.models.partners import BusinessPartner
from alsvid.models.service import ServiceCase, ServiceCaseStatusEvent
from alsvid.models.vehicle import Vehicle
from alsvid.services.vehicle_lifecycle import VehicleEventType, record_vehicle_event

SERVICE_PRIORITIES = {"LOW", "NORMAL", "HIGH", "URGENT"}


class ServiceError(ValueError):
    pass


def open_service_case(
    db: Session,
    *,
    vehicle_id: str,
    issue_summary: str,
    dealer_partner_id: str | None = None,
    diagnosis: str | None = None,
    priority: str = "NORMAL",
    actor_id: str | None = None,
) -> ServiceCase:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise ServiceError("vehicle not found")
    if vehicle.factory_outbound_at is None:
        raise ServiceError("vehicle must have factory outbound before service")

    normalized_priority = priority.strip().upper()
    if normalized_priority not in SERVICE_PRIORITIES:
        raise ServiceError("unsupported service priority")

    dealer: BusinessPartner | None = None
    if dealer_partner_id is not None:
        dealer = db.get(BusinessPartner, dealer_partner_id)
        if dealer is None or not dealer.active or not dealer.is_dealer:
            raise ServiceError("service dealer must be an active dealer partner")

    summary = issue_summary.strip()
    if not summary:
        raise ServiceError("service issue summary is required")

    case = ServiceCase(
        id=new_id("service_case"),
        vehicle_id=vehicle.id,
        dealer_partner_id=dealer.id if dealer is not None else None,
        status="OPEN",
        priority=normalized_priority,
        issue_summary=summary,
        diagnosis=(diagnosis or "").strip() or None,
    )
    db.add(case)
    db.add(
        ServiceCaseStatusEvent(
            id=new_id("service_status_event"),
            service_case_id=case.id,
            from_status=None,
            to_status="OPEN",
            note="case opened",
            changed_by=actor_id,
        )
    )
    db.add(
        AuditEvent(
            actor_id=actor_id,
            action="alsvid.service.opened",
            entity_type="service_case",
            entity_id=case.id,
        )
    )
    record_vehicle_event(
        db,
        vehicle_id=vehicle.id,
        event_type=VehicleEventType.SERVICE_OPENED,
        actor_id=actor_id,
        dealer_partner_id=dealer.id if dealer is not None else None,
        reference_type="SERVICE_CASE",
        reference_id=case.id,
        event_data={"priority": normalized_priority},
    )
    db.flush()
    return case
