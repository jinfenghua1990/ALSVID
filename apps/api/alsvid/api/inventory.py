from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, enforce_csrf, permission_dependency
from alsvid.db import get_db
from alsvid.models.catalog import SKU
from alsvid.models.inventory import DealerInventoryReservation, InventoryLocation, InventoryMovement
from alsvid.models.partners import BusinessPartner

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])


def _quantity(value: str, *, positive: bool = False) -> Decimal:
    try:
        amount = Decimal(value)
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Invalid quantity") from exc
    if positive and amount <= 0:
        raise HTTPException(status_code=422, detail="Quantity must be positive")
    if not positive and amount == 0:
        raise HTTPException(status_code=422, detail="Quantity delta cannot be zero")
    return amount.quantize(Decimal("0.0001"))


def _active_reservation_filter(now: datetime):
    return (
        DealerInventoryReservation.status == "ACTIVE",
        or_(
            DealerInventoryReservation.expires_at.is_(None),
            DealerInventoryReservation.expires_at > now,
        ),
    )


def _stock(db: Session, *, location_id: str, sku_id: str) -> Decimal:
    total = db.scalar(
        select(func.coalesce(func.sum(InventoryMovement.quantity_delta), 0)).where(
            InventoryMovement.location_id == location_id,
            InventoryMovement.sku_id == sku_id,
        )
    )
    return Decimal(str(total or 0))


def _reserved(db: Session, *, location_id: str, sku_id: str, dealer_id: str | None = None) -> Decimal:
    now = datetime.now(UTC)
    stmt = select(func.coalesce(func.sum(DealerInventoryReservation.quantity), 0)).where(
        DealerInventoryReservation.location_id == location_id,
        DealerInventoryReservation.sku_id == sku_id,
        *_active_reservation_filter(now),
    )
    if dealer_id is not None:
        stmt = stmt.where(DealerInventoryReservation.dealer_partner_id == dealer_id)
    total = db.scalar(stmt)
    return Decimal(str(total or 0))


def _availability(db: Session, *, location_id: str, sku_id: str, dealer_id: str | None = None) -> dict:
    actual = _stock(db, location_id=location_id, sku_id=sku_id)
    reserved_total = _reserved(db, location_id=location_id, sku_id=sku_id)
    own_reserved = (
        _reserved(db, location_id=location_id, sku_id=sku_id, dealer_id=dealer_id)
        if dealer_id is not None
        else Decimal("0")
    )
    public_available = max(actual - reserved_total, Decimal("0"))
    return {
        "location_id": location_id,
        "sku_id": sku_id,
        "actual_stock": actual,
        "reserved_total": reserved_total,
        "public_available": public_available,
        "dealer_reserved": own_reserved,
        "available_to_dealer": public_available + own_reserved,
    }


def _dealer(db: Session, dealer_partner_id: str) -> BusinessPartner:
    dealer = db.get(BusinessPartner, dealer_partner_id)
    if dealer is None or not dealer.active or not dealer.is_dealer:
        raise HTTPException(status_code=422, detail="Dealer partner is invalid")
    return dealer


class LocationCreate(BaseModel):
    code: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=160)
    location_type: str = Field(default="WAREHOUSE", max_length=32)
    country_code: str = Field(min_length=2, max_length=2)
    partner_id: str | None = None


class MovementCreate(BaseModel):
    location_id: str
    sku_id: str
    quantity_delta: str
    movement_type: str = Field(min_length=1, max_length=32)
    reference_type: str | None = Field(default=None, max_length=40)
    reference_id: str | None = Field(default=None, max_length=120)
    occurred_at: datetime | None = None
    note: str | None = None


class ReservationCreate(BaseModel):
    dealer_partner_id: str
    location_id: str
    sku_id: str
    quantity: str
    reservation_kind: str = Field(default="QUOTE", max_length=24)
    expires_at: datetime | None = None
    external_system: str | None = Field(default=None, max_length=60)
    external_id: str | None = Field(default=None, max_length=160)
    note: str | None = None


@router.post("/locations", status_code=201)
def create_location(
    payload: LocationCreate,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.supply_chain.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    if payload.partner_id is not None and db.get(BusinessPartner, payload.partner_id) is None:
        raise HTTPException(status_code=422, detail="Location partner is invalid")
    country_code = payload.country_code.strip().upper()
    row = InventoryLocation(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        location_type=payload.location_type.strip().upper(),
        country_code=country_code,
        partner_id=payload.partner_id,
    )
    db.add(row)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Inventory location code already exists") from exc
    db.refresh(row)
    return {
        "id": row.id,
        "code": row.code,
        "name": row.name,
        "location_type": row.location_type,
        "country_code": row.country_code,
        "partner_id": row.partner_id,
    }


@router.post("/movements", status_code=201)
def post_movement(
    payload: MovementCreate,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.supply_chain.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    location = db.get(InventoryLocation, payload.location_id)
    sku = db.get(SKU, payload.sku_id)
    if location is None or not location.active:
        raise HTTPException(status_code=422, detail="Inventory location is invalid")
    if sku is None or not sku.active:
        raise HTTPException(status_code=422, detail="SKU is invalid")
    quantity_delta = _quantity(payload.quantity_delta)
    new_stock = _stock(db, location_id=location.id, sku_id=sku.id) + quantity_delta
    if new_stock < 0:
        raise HTTPException(status_code=409, detail="Inventory movement would make stock negative")
    row = InventoryMovement(
        location_id=location.id,
        sku_id=sku.id,
        quantity_delta=quantity_delta,
        movement_type=payload.movement_type.strip().upper(),
        reference_type=payload.reference_type.strip().upper() if payload.reference_type else None,
        reference_id=payload.reference_id.strip() if payload.reference_id else None,
        occurred_at=payload.occurred_at or datetime.now(UTC),
        note=payload.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "new_stock": new_stock}


@router.get("/availability")
def availability(
    location_id: str,
    sku_id: str,
    dealer_partner_id: str | None = None,
    _principal: Principal = Depends(permission_dependency("alsvid.supply_chain.read")),
    db: Session = Depends(get_db),
):
    if db.get(InventoryLocation, location_id) is None:
        raise HTTPException(status_code=404, detail="Inventory location not found")
    if db.get(SKU, sku_id) is None:
        raise HTTPException(status_code=404, detail="SKU not found")
    if dealer_partner_id is not None:
        _dealer(db, dealer_partner_id)
    return _availability(
        db,
        location_id=location_id,
        sku_id=sku_id,
        dealer_id=dealer_partner_id,
    )


@router.post("/reservations", status_code=201)
def create_reservation(
    payload: ReservationCreate,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.supply_chain.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    _dealer(db, payload.dealer_partner_id)
    location = db.get(InventoryLocation, payload.location_id)
    sku = db.get(SKU, payload.sku_id)
    if location is None or not location.active:
        raise HTTPException(status_code=422, detail="Inventory location is invalid")
    if sku is None or not sku.active:
        raise HTTPException(status_code=422, detail="SKU is invalid")
    quantity = _quantity(payload.quantity, positive=True)
    available = _availability(db, location_id=location.id, sku_id=sku.id)["public_available"]
    if quantity > available:
        raise HTTPException(status_code=409, detail="Insufficient available inventory")
    row = DealerInventoryReservation(
        dealer_partner_id=payload.dealer_partner_id,
        location_id=location.id,
        sku_id=sku.id,
        quantity=quantity,
        reservation_kind=payload.reservation_kind.strip().upper(),
        starts_at=datetime.now(UTC),
        expires_at=payload.expires_at,
        external_system=payload.external_system.strip().upper() if payload.external_system else None,
        external_id=payload.external_id.strip() if payload.external_id else None,
        note=payload.note,
    )
    db.add(row)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Reservation external identity already exists") from exc
    db.refresh(row)
    return {
        "id": row.id,
        "status": row.status,
        "quantity": row.quantity,
        "availability": _availability(
            db,
            location_id=location.id,
            sku_id=sku.id,
            dealer_id=payload.dealer_partner_id,
        ),
    }


@router.post("/reservations/{reservation_id}/release")
def release_reservation(
    reservation_id: str,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.supply_chain.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    row = db.get(DealerInventoryReservation, reservation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if row.status == "ACTIVE":
        row.status = "RELEASED"
        row.released_at = datetime.now(UTC)
        db.commit()
        db.refresh(row)
    return {"id": row.id, "status": row.status, "released_at": row.released_at}
