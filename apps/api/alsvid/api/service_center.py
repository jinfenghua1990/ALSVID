from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, permission_dependency
from alsvid.db import get_db
from alsvid.services.service_center import list_service_cases, list_service_vehicles

router = APIRouter(prefix="/api/v1/service-center", tags=["service-center"])


@router.get("/vehicles")
def get_service_vehicles(
    _principal: Principal = Depends(permission_dependency("alsvid.service.read")),
    db: Session = Depends(get_db),
):
    return list_service_vehicles(db)


@router.get("/cases")
def get_service_cases(
    _principal: Principal = Depends(permission_dependency("alsvid.service.read")),
    db: Session = Depends(get_db),
):
    return list_service_cases(db)
