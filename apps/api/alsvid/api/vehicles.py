from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, permission_dependency
from alsvid.db import get_db
from alsvid.services.vehicle_center import VehicleCenterError, list_vehicles, vehicle_360

router = APIRouter(prefix="/api/v1/vehicle-center", tags=["vehicle-center"])


@router.get("/vehicles")
def list_vehicle_center(
    q: str | None = None,
    status: str | None = None,
    model_code: str | None = None,
    dealer_partner_id: str | None = None,
    buyer_bound: bool | None = None,
    attention_only: bool = False,
    _principal: Principal = Depends(permission_dependency("alsvid.vehicle.read")),
    db: Session = Depends(get_db),
):
    return list_vehicles(
        db,
        q=q,
        status=status,
        model_code=model_code,
        dealer_partner_id=dealer_partner_id,
        buyer_bound=buyer_bound,
        attention_only=attention_only,
    )


@router.get("/vehicles/{vehicle_id}")
def get_vehicle_360(
    vehicle_id: str,
    _principal: Principal = Depends(permission_dependency("alsvid.vehicle.read")),
    db: Session = Depends(get_db),
):
    try:
        return vehicle_360(db, vehicle_id=vehicle_id)
    except VehicleCenterError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/frames/{frame_number}")
def get_vehicle_360_by_frame(
    frame_number: str,
    _principal: Principal = Depends(permission_dependency("alsvid.vehicle.read")),
    db: Session = Depends(get_db),
):
    try:
        return vehicle_360(db, frame_number=frame_number)
    except VehicleCenterError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
