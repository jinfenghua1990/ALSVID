from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, enforce_csrf, permission_dependency
from alsvid.config import Settings, get_settings
from alsvid.db import get_db
from alsvid.models.assets import Asset
from alsvid.models.customer import MarketingConsentEvent, MyAlsvidAccount
from alsvid.models.engineering import BicycleModel
from alsvid.models.partners import BusinessPartner
from alsvid.models.service import ServiceCase, Warranty
from alsvid.models.vehicle import Vehicle
from alsvid.services.auth import AuthenticationFailed
from alsvid.services.my_alsvid import (
    MyAlsvidError,
    issue_vehicle_claim_token,
    login_buyer_and_claim_vehicle,
    register_buyer_and_claim,
    update_marketing_consent,
)
from alsvid.services.vehicle_lifecycle import VehicleLifecycleError, normalize_frame_number

router = APIRouter(tags=["my-alsvid"])


class ClaimTokenResponse(BaseModel):
    claim_fragment_url: str
    expires_at: datetime


class ClaimRegisterRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=120)
    password: str
    email_marketing_consent: bool = False
    policy_version: str | None = Field(default=None, max_length=80)


class ClaimLoginRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    email: EmailStr
    password: str


class ClaimSessionResponse(BaseModel):
    authenticated: bool = True
    display_name: str
    email: str
    csrf_token: str


class GarageVehicleResponse(BaseModel):
    frame_number: str
    model_code: str
    status: str
    purchase_date: date | None = None
    activated_at: datetime | None = None
    warranty_status: str | None = None


class CustomerAssetResponse(BaseModel):
    asset_type: str
    purpose: str
    file_name: str
    visibility: str
    url: str | None = None


class ServiceHistoryItem(BaseModel):
    status: str
    priority: str
    issue_summary: str
    opened_at: datetime
    closed_at: datetime | None = None


class GarageVehicleDetailResponse(GarageVehicleResponse):
    assets: list[CustomerAssetResponse]
    service_history: list[ServiceHistoryItem]


class MarketingConsentRequest(BaseModel):
    granted: bool
    policy_version: str = Field(min_length=1, max_length=80)


class MarketingConsentResponse(BaseModel):
    status: str
    policy_version: str
    occurred_at: datetime


def _set_session_cookie(response: Response, *, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_hours * 60 * 60,
        httponly=True,
        secure=settings.secure_session_cookie,
        samesite="lax",
        path="/",
    )


def _buyer_partner(db: Session, *, user_id: str) -> BusinessPartner:
    account = db.get(MyAlsvidAccount, user_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="My ALSVID account required")
    partner = db.get(BusinessPartner, account.partner_id)
    if partner is None or not partner.active or not partner.is_customer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="My ALSVID account unavailable")
    return partner


def _owner_vehicle_or_404(
    db: Session,
    *,
    partner_id: str,
    frame_number: str,
) -> Vehicle:
    try:
        normalized = normalize_frame_number(frame_number)
    except VehicleLifecycleError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found") from exc
    vehicle = db.scalar(
        select(Vehicle).where(
            Vehicle.frame_number == normalized,
            Vehicle.current_customer_partner_id == partner_id,
        )
    )
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


def _garage_vehicle(db: Session, vehicle: Vehicle) -> GarageVehicleResponse:
    model = db.get(BicycleModel, vehicle.model_id)
    warranty = db.scalar(select(Warranty).where(Warranty.vehicle_id == vehicle.id))
    return GarageVehicleResponse(
        frame_number=vehicle.frame_number,
        model_code=model.code if model is not None else "UNKNOWN",
        status=vehicle.status,
        purchase_date=vehicle.purchase_date,
        activated_at=vehicle.activated_at,
        warranty_status=warranty.status if warranty is not None else None,
    )


@router.post(
    "/api/v1/vehicle-claims/{frame_number}",
    response_model=ClaimTokenResponse,
    tags=["vehicle-admin"],
)
def create_vehicle_claim(
    frame_number: str,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.vehicle.write")),
    db: Session = Depends(get_db),
) -> ClaimTokenResponse:
    enforce_csrf(request, principal)
    try:
        normalized = normalize_frame_number(frame_number)
    except VehicleLifecycleError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found") from exc
    vehicle = db.scalar(select(Vehicle).where(Vehicle.frame_number == normalized))
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    try:
        token, expires_at = issue_vehicle_claim_token(
            db,
            vehicle=vehicle,
            actor_id=principal.user.id,
        )
        db.commit()
    except MyAlsvidError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return ClaimTokenResponse(
        claim_fragment_url=f"/my/alsvid/claim#{token}",
        expires_at=expires_at,
    )


@router.post("/api/v1/my-alsvid/claim/register", response_model=ClaimSessionResponse)
def register_claim(
    payload: ClaimRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ClaimSessionResponse:
    try:
        user, _, issued = register_buyer_and_claim(
            db,
            token=payload.token,
            email=str(payload.email),
            display_name=payload.display_name,
            password=payload.password,
            email_marketing_consent=payload.email_marketing_consent,
            policy_version=payload.policy_version,
            settings=settings,
        )
        db.commit()
    except MyAlsvidError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    _set_session_cookie(response, token=issued.token, settings=settings)
    return ClaimSessionResponse(
        display_name=user.display_name,
        email=user.email,
        csrf_token=issued.session.csrf_token,
    )


@router.post("/api/v1/my-alsvid/claim/login", response_model=ClaimSessionResponse)
def login_claim(
    payload: ClaimLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ClaimSessionResponse:
    try:
        user, issued = login_buyer_and_claim_vehicle(
            db,
            token=payload.token,
            email=str(payload.email),
            password=payload.password,
            settings=settings,
        )
        db.commit()
    except AuthenticationFailed as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials") from exc
    except MyAlsvidError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    _set_session_cookie(response, token=issued.token, settings=settings)
    return ClaimSessionResponse(
        display_name=user.display_name,
        email=user.email,
        csrf_token=issued.session.csrf_token,
    )


@router.get("/api/v1/my-alsvid/garage", response_model=list[GarageVehicleResponse])
def garage(
    principal: Principal = Depends(permission_dependency("alsvid.buyer.read")),
    db: Session = Depends(get_db),
) -> list[GarageVehicleResponse]:
    partner = _buyer_partner(db, user_id=principal.user.id)
    vehicles = db.scalars(
        select(Vehicle)
        .where(Vehicle.current_customer_partner_id == partner.id)
        .order_by(Vehicle.created_at.desc())
    ).all()
    return [_garage_vehicle(db, vehicle) for vehicle in vehicles]


@router.get(
    "/api/v1/my-alsvid/garage/{frame_number}",
    response_model=GarageVehicleDetailResponse,
)
def garage_vehicle(
    frame_number: str,
    principal: Principal = Depends(permission_dependency("alsvid.buyer.read")),
    db: Session = Depends(get_db),
) -> GarageVehicleDetailResponse:
    partner = _buyer_partner(db, user_id=principal.user.id)
    vehicle = _owner_vehicle_or_404(db, partner_id=partner.id, frame_number=frame_number)
    base = _garage_vehicle(db, vehicle)
    assets = db.scalars(
        select(Asset)
        .where(
            Asset.owner_type == "VEHICLE",
            Asset.owner_id == vehicle.id,
            Asset.visibility.in_(("PUBLIC", "CUSTOMER")),
        )
        .order_by(Asset.created_at.desc())
    ).all()
    service_cases = db.scalars(
        select(ServiceCase)
        .where(ServiceCase.vehicle_id == vehicle.id)
        .order_by(ServiceCase.opened_at.desc())
    ).all()
    return GarageVehicleDetailResponse(
        **base.model_dump(),
        assets=[
            CustomerAssetResponse(
                asset_type=asset.asset_type,
                purpose=asset.purpose,
                file_name=asset.file_name,
                visibility=asset.visibility,
                url=None,
            )
            for asset in assets
        ],
        service_history=[
            ServiceHistoryItem(
                status=case.status,
                priority=case.priority,
                issue_summary=case.issue_summary,
                opened_at=case.opened_at,
                closed_at=case.closed_at,
            )
            for case in service_cases
        ],
    )


@router.post(
    "/api/v1/my-alsvid/account/marketing-consent",
    response_model=MarketingConsentResponse,
)
def marketing_consent(
    payload: MarketingConsentRequest,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.buyer.write")),
    db: Session = Depends(get_db),
) -> MarketingConsentResponse:
    enforce_csrf(request, principal)
    partner = _buyer_partner(db, user_id=principal.user.id)
    try:
        event = update_marketing_consent(
            db,
            partner=partner,
            user=principal.user,
            granted=payload.granted,
            policy_version=payload.policy_version,
        )
        db.commit()
    except MyAlsvidError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return MarketingConsentResponse(
        status=event.status,
        policy_version=event.policy_version,
        occurred_at=event.occurred_at,
    )


@router.get(
    "/api/v1/my-alsvid/account/marketing-consent",
    response_model=MarketingConsentResponse | None,
)
def current_marketing_consent(
    principal: Principal = Depends(permission_dependency("alsvid.buyer.read")),
    db: Session = Depends(get_db),
) -> MarketingConsentResponse | None:
    partner = _buyer_partner(db, user_id=principal.user.id)
    event = db.scalar(
        select(MarketingConsentEvent)
        .where(
            MarketingConsentEvent.partner_id == partner.id,
            MarketingConsentEvent.channel == "EMAIL",
        )
        .order_by(MarketingConsentEvent.occurred_at.desc(), MarketingConsentEvent.id.desc())
        .limit(1)
    )
    if event is None:
        return None
    return MarketingConsentResponse(
        status=event.status,
        policy_version=event.policy_version,
        occurred_at=event.occurred_at,
    )
