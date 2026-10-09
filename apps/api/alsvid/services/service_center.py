from sqlalchemy import select
from sqlalchemy.orm import Session

from alsvid.models.catalog import SKU
from alsvid.models.engineering import BicycleModel
from alsvid.models.partners import BusinessPartner
from alsvid.models.service import ServiceCase, Warranty
from alsvid.models.vehicle import Vehicle


def _partner(db: Session, partner_id: str | None) -> dict | None:
    if partner_id is None:
        return None
    row = db.get(BusinessPartner, partner_id)
    if row is None:
        return {"id": partner_id, "code": "", "name": ""}
    return {"id": row.id, "code": row.code, "name": row.name}


def list_service_vehicles(db: Session) -> list[dict]:
    rows = db.execute(
        select(Vehicle, BicycleModel)
        .join(BicycleModel, BicycleModel.id == Vehicle.model_id)
        .order_by(Vehicle.frame_number)
    ).all()
    result: list[dict] = []
    for vehicle, model in rows:
        warranty = db.scalar(select(Warranty).where(Warranty.vehicle_id == vehicle.id).limit(1))
        sku = db.get(SKU, vehicle.sku_id) if vehicle.sku_id else None
        result.append(
            {
                "id": vehicle.id,
                "frame_number": vehicle.frame_number,
                "status": vehicle.status,
                "purchase_date": vehicle.purchase_date,
                "activated_at": vehicle.activated_at,
                "model": {"id": model.id, "code": model.code, "name": model.name},
                "sku": (
                    {"id": sku.id, "code": sku.code, "name": sku.name}
                    if sku is not None
                    else None
                ),
                "customer": _partner(db, vehicle.current_customer_partner_id),
                "dealer": _partner(db, vehicle.current_dealer_partner_id),
                "warranty": (
                    {
                        "id": warranty.id,
                        "status": warranty.status,
                        "start_date": warranty.start_date,
                        "end_date": warranty.end_date,
                    }
                    if warranty is not None
                    else None
                ),
            }
        )
    return result


def list_service_cases(db: Session) -> list[dict]:
    rows = db.execute(
        select(ServiceCase, Vehicle, BicycleModel)
        .join(Vehicle, Vehicle.id == ServiceCase.vehicle_id)
        .join(BicycleModel, BicycleModel.id == Vehicle.model_id)
        .order_by(ServiceCase.opened_at.desc(), ServiceCase.id.desc())
    ).all()
    return [
        {
            "id": case.id,
            "status": case.status,
            "priority": case.priority,
            "issue_summary": case.issue_summary,
            "diagnosis": case.diagnosis,
            "resolution": case.resolution,
            "opened_at": case.opened_at,
            "closed_at": case.closed_at,
            "vehicle": {
                "id": vehicle.id,
                "frame_number": vehicle.frame_number,
                "status": vehicle.status,
            },
            "model": {"id": model.id, "code": model.code, "name": model.name},
            "dealer": _partner(db, case.dealer_partner_id),
        }
        for case, vehicle, model in rows
    ]
