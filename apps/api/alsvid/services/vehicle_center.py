from sqlalchemy import func, select
from sqlalchemy.orm import Session

from alsvid.models.assets import Asset
from alsvid.models.catalog import SKU
from alsvid.models.engineering import BicycleModel
from alsvid.models.partners import BusinessPartner
from alsvid.models.service import ServiceCase, Warranty
from alsvid.models.vehicle import Vehicle, VehicleLifecycleEvent

_OPEN_SERVICE_STATUSES = {"OPEN", "DIAGNOSING", "WAITING_PARTS", "REPAIRING", "RESOLVED"}


class VehicleCenterError(ValueError):
    pass


def _partner_map(db: Session, partner_ids: set[str]) -> dict[str, BusinessPartner]:
    if not partner_ids:
        return {}
    rows = db.scalars(select(BusinessPartner).where(BusinessPartner.id.in_(partner_ids))).all()
    return {row.id: row for row in rows}


def _partner_summary(partner: BusinessPartner | None) -> dict | None:
    if partner is None:
        return None
    return {
        "id": partner.id,
        "code": partner.code,
        "name": partner.name,
        "country_code": partner.country_code,
    }


def _warranty_summary(warranty: Warranty | None) -> dict | None:
    if warranty is None:
        return None
    return {
        "id": warranty.id,
        "status": warranty.status,
        "start_date": warranty.start_date,
        "end_date": warranty.end_date,
    }


def list_vehicles(
    db: Session,
    *,
    q: str | None = None,
    status: str | None = None,
    model_code: str | None = None,
    dealer_partner_id: str | None = None,
    buyer_bound: bool | None = None,
    attention_only: bool = False,
) -> list[dict]:
    statement = select(Vehicle, BicycleModel).join(BicycleModel, BicycleModel.id == Vehicle.model_id)
    normalized_status = (status or "").strip().upper()
    normalized_model = (model_code or "").strip().upper()
    if normalized_status:
        statement = statement.where(Vehicle.status == normalized_status)
    if normalized_model:
        statement = statement.where(BicycleModel.code == normalized_model)
    if dealer_partner_id:
        statement = statement.where(Vehicle.current_dealer_partner_id == dealer_partner_id)
    if buyer_bound is True:
        statement = statement.where(Vehicle.current_customer_partner_id.is_not(None))
    elif buyer_bound is False:
        statement = statement.where(Vehicle.current_customer_partner_id.is_(None))

    rows = db.execute(statement.order_by(Vehicle.frame_number)).all()
    if not rows:
        return []

    vehicles = [vehicle for vehicle, _model in rows]
    vehicle_ids = {vehicle.id for vehicle in vehicles}
    sku_ids = {vehicle.sku_id for vehicle in vehicles if vehicle.sku_id}
    partner_ids = {
        partner_id
        for vehicle in vehicles
        for partner_id in (vehicle.current_customer_partner_id, vehicle.current_dealer_partner_id)
        if partner_id
    }
    sku_map = (
        {row.id: row for row in db.scalars(select(SKU).where(SKU.id.in_(sku_ids))).all()}
        if sku_ids
        else {}
    )
    partners = _partner_map(db, partner_ids)
    warranty_map = {
        row.vehicle_id: row
        for row in db.scalars(select(Warranty).where(Warranty.vehicle_id.in_(vehicle_ids))).all()
    }
    open_case_counts = {
        vehicle_id: int(count)
        for vehicle_id, count in db.execute(
            select(ServiceCase.vehicle_id, func.count(ServiceCase.id))
            .where(
                ServiceCase.vehicle_id.in_(vehicle_ids),
                ServiceCase.status.in_(_OPEN_SERVICE_STATUSES),
            )
            .group_by(ServiceCase.vehicle_id)
        ).all()
    }

    query = (q or "").strip().lower()
    result: list[dict] = []
    for vehicle, model in rows:
        sku = sku_map.get(vehicle.sku_id) if vehicle.sku_id else None
        customer = partners.get(vehicle.current_customer_partner_id) if vehicle.current_customer_partner_id else None
        dealer = partners.get(vehicle.current_dealer_partner_id) if vehicle.current_dealer_partner_id else None
        warranty = warranty_map.get(vehicle.id)
        open_cases = open_case_counts.get(vehicle.id, 0)
        if attention_only and open_cases == 0:
            continue
        if query:
            haystack = " ".join(
                part
                for part in (
                    vehicle.frame_number,
                    model.code,
                    model.name,
                    sku.code if sku else "",
                    sku.name if sku else "",
                    vehicle.production_batch or "",
                    dealer.code if dealer else "",
                    dealer.name if dealer else "",
                    customer.code if customer else "",
                    customer.name if customer else "",
                )
                if part
            ).lower()
            if query not in haystack:
                continue
        result.append(
            {
                "id": vehicle.id,
                "frame_number": vehicle.frame_number,
                "status": vehicle.status,
                "model": {
                    "id": model.id,
                    "code": model.code,
                    "name": model.name,
                    "generation": model.generation,
                },
                "sku": (
                    {"id": sku.id, "code": sku.code, "name": sku.name} if sku is not None else None
                ),
                "production_batch": vehicle.production_batch,
                "factory_source": vehicle.factory_source,
                "factory_outbound_at": vehicle.factory_outbound_at,
                "current_dealer": _partner_summary(dealer),
                "current_customer": _partner_summary(customer),
                "purchase_date": vehicle.purchase_date,
                "activated_at": vehicle.activated_at,
                "warranty": _warranty_summary(warranty),
                "open_service_cases": open_cases,
                "needs_attention": open_cases > 0,
            }
        )
    return result


def vehicle_360(db: Session, *, vehicle_id: str | None = None, frame_number: str | None = None) -> dict:
    if vehicle_id:
        vehicle = db.get(Vehicle, vehicle_id)
    elif frame_number:
        normalized_frame = frame_number.strip().upper()
        vehicle = db.scalar(select(Vehicle).where(func.upper(Vehicle.frame_number) == normalized_frame))
    else:
        raise VehicleCenterError("vehicle identity is required")
    if vehicle is None:
        raise VehicleCenterError("vehicle not found")

    model = db.get(BicycleModel, vehicle.model_id)
    sku = db.get(SKU, vehicle.sku_id) if vehicle.sku_id else None
    dealer = (
        db.get(BusinessPartner, vehicle.current_dealer_partner_id)
        if vehicle.current_dealer_partner_id
        else None
    )
    customer = (
        db.get(BusinessPartner, vehicle.current_customer_partner_id)
        if vehicle.current_customer_partner_id
        else None
    )
    warranty = db.scalar(select(Warranty).where(Warranty.vehicle_id == vehicle.id))
    lifecycle = db.scalars(
        select(VehicleLifecycleEvent)
        .where(VehicleLifecycleEvent.vehicle_id == vehicle.id)
        .order_by(VehicleLifecycleEvent.sequence_no)
    ).all()
    cases = db.scalars(
        select(ServiceCase)
        .where(ServiceCase.vehicle_id == vehicle.id)
        .order_by(ServiceCase.opened_at.desc(), ServiceCase.id)
    ).all()
    assets = db.scalars(
        select(Asset)
        .where(Asset.owner_type == "VEHICLE", Asset.owner_id == vehicle.id)
        .order_by(Asset.created_at.desc(), Asset.id)
    ).all()

    return {
        "id": vehicle.id,
        "frame_number": vehicle.frame_number,
        "status": vehicle.status,
        "model": (
            {
                "id": model.id,
                "code": model.code,
                "name": model.name,
                "generation": model.generation,
            }
            if model is not None
            else None
        ),
        "sku": ({"id": sku.id, "code": sku.code, "name": sku.name} if sku is not None else None),
        "birth": {
            "bom_revision_id": vehicle.bom_revision_id,
            "build_snapshot": vehicle.build_snapshot,
            "production_batch": vehicle.production_batch,
            "factory_source": vehicle.factory_source,
            "production_completed_at": vehicle.production_completed_at,
            "factory_outbound_at": vehicle.factory_outbound_at,
            "factory_outbound_reference": vehicle.factory_outbound_reference,
        },
        "current_dealer": _partner_summary(dealer),
        "current_customer": _partner_summary(customer),
        "purchase_date": vehicle.purchase_date,
        "activated_at": vehicle.activated_at,
        "warranty": _warranty_summary(warranty),
        "lifecycle": [
            {
                "id": event.id,
                "sequence_no": event.sequence_no,
                "event_type": event.event_type,
                "occurred_at": event.occurred_at,
                "dealer_partner_id": event.dealer_partner_id,
                "customer_partner_id": event.customer_partner_id,
                "reference_type": event.reference_type,
                "reference_id": event.reference_id,
                "note": event.note,
                "event_data": event.event_data,
            }
            for event in lifecycle
        ],
        "service_cases": [
            {
                "id": row.id,
                "status": row.status,
                "priority": row.priority,
                "issue_summary": row.issue_summary,
                "dealer_partner_id": row.dealer_partner_id,
                "opened_at": row.opened_at,
                "closed_at": row.closed_at,
            }
            for row in cases
        ],
        "assets": [
            {
                "id": row.id,
                "asset_type": row.asset_type,
                "purpose": row.purpose,
                "file_name": row.file_name,
                "mime_type": row.mime_type,
                "visibility": row.visibility,
            }
            for row in assets
        ],
    }
