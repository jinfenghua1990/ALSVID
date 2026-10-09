from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, enforce_csrf, permission_dependency
from alsvid.db import get_db
from alsvid.models.engineering import BicycleModel
from alsvid.models.partners import BusinessPartner
from alsvid.models.vehicle import Vehicle
from alsvid.services.dealer_portal import (
    DealerPortalError,
    complete_dealer_pdi,
    dealer_for_user,
    dealer_handover,
    dealer_vehicle,
    record_dealer_receipt,
)

router = APIRouter(prefix="/api/v1/dealer", tags=["dealer"])


class DealerVehicleResponse(BaseModel):
    frame_number: str
    status: str
    model_code: str
    purchase_date: date | None = None


class ReceiptRequest(BaseModel):
    reference: str = Field(default="", max_length=120)
    occurred_at: datetime | None = None


class PdiRequest(BaseModel):
    checks: dict[str, bool]
    note: str = Field(default="", max_length=500)
    occurred_at: datetime | None = None


class HandoverRequest(BaseModel):
    buyer_name: str = Field(min_length=1, max_length=200)
    buyer_email: EmailStr
    buyer_phone: str = Field(default="", max_length=80)
    purchase_date: date
    occurred_at: datetime | None = None


def _dealer_identity(db: Session, *, user_id: str) -> BusinessPartner:
    try:
        _, partner = dealer_for_user(db, user_id=user_id)
    except DealerPortalError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dealer access denied") from exc
    return partner


def _vehicle_response(db: Session, vehicle: Vehicle) -> DealerVehicleResponse:
    model = db.get(BicycleModel, vehicle.model_id)
    return DealerVehicleResponse(
        frame_number=vehicle.frame_number,
        status=vehicle.status,
        model_code=model.code if model is not None else "UNKNOWN",
        purchase_date=vehicle.purchase_date,
    )


def _scoped_vehicle_or_404(
    db: Session,
    *,
    frame_number: str,
    dealer_partner_id: str,
) -> Vehicle:
    try:
        return dealer_vehicle(
            db,
            frame_number=frame_number,
            dealer_partner_id=dealer_partner_id,
        )
    except DealerPortalError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found") from exc


@router.get("/vehicles/{frame_number}", response_model=DealerVehicleResponse)
def get_vehicle(
    frame_number: str,
    principal: Principal = Depends(permission_dependency("alsvid.dealer.read")),
    db: Session = Depends(get_db),
) -> DealerVehicleResponse:
    dealer = _dealer_identity(db, user_id=principal.user.id)
    vehicle = _scoped_vehicle_or_404(
        db,
        frame_number=frame_number,
        dealer_partner_id=dealer.id,
    )
    return _vehicle_response(db, vehicle)


@router.post("/vehicles/{frame_number}/receipt", response_model=DealerVehicleResponse)
def receive_vehicle(
    frame_number: str,
    payload: ReceiptRequest,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.dealer.receive")),
    db: Session = Depends(get_db),
) -> DealerVehicleResponse:
    enforce_csrf(request, principal)
    dealer = _dealer_identity(db, user_id=principal.user.id)
    _scoped_vehicle_or_404(db, frame_number=frame_number, dealer_partner_id=dealer.id)
    try:
        record_dealer_receipt(
            db,
            frame_number=frame_number,
            dealer_partner_id=dealer.id,
            actor_id=principal.user.id,
            reference=payload.reference,
            occurred_at=payload.occurred_at,
        )
        db.commit()
    except DealerPortalError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    vehicle = _scoped_vehicle_or_404(db, frame_number=frame_number, dealer_partner_id=dealer.id)
    return _vehicle_response(db, vehicle)


@router.post("/vehicles/{frame_number}/pdi", response_model=DealerVehicleResponse)
def complete_pdi(
    frame_number: str,
    payload: PdiRequest,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.dealer.pdi")),
    db: Session = Depends(get_db),
) -> DealerVehicleResponse:
    enforce_csrf(request, principal)
    dealer = _dealer_identity(db, user_id=principal.user.id)
    _scoped_vehicle_or_404(db, frame_number=frame_number, dealer_partner_id=dealer.id)
    try:
        complete_dealer_pdi(
            db,
            frame_number=frame_number,
            dealer_partner_id=dealer.id,
            actor_id=principal.user.id,
            checks=payload.checks,
            note=payload.note,
            occurred_at=payload.occurred_at,
        )
        db.commit()
    except DealerPortalError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    vehicle = _scoped_vehicle_or_404(db, frame_number=frame_number, dealer_partner_id=dealer.id)
    return _vehicle_response(db, vehicle)


@router.post("/vehicles/{frame_number}/handover", response_model=DealerVehicleResponse)
def handover_vehicle(
    frame_number: str,
    payload: HandoverRequest,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.dealer.handover")),
    db: Session = Depends(get_db),
) -> DealerVehicleResponse:
    enforce_csrf(request, principal)
    dealer = _dealer_identity(db, user_id=principal.user.id)
    _scoped_vehicle_or_404(db, frame_number=frame_number, dealer_partner_id=dealer.id)
    try:
        vehicle, _ = dealer_handover(
            db,
            frame_number=frame_number,
            dealer_partner_id=dealer.id,
            actor_id=principal.user.id,
            buyer_name=payload.buyer_name,
            buyer_email=str(payload.buyer_email),
            buyer_phone=payload.buyer_phone,
            purchase_date=payload.purchase_date,
            occurred_at=payload.occurred_at,
        )
        db.commit()
    except DealerPortalError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return _vehicle_response(db, vehicle)
