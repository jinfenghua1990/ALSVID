from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, enforce_csrf, permission_dependency
from alsvid.db import get_db
from alsvid.models.commercial import (
    CommercialChannel,
    CommercialFinanceFact,
    CommercialOrderFact,
    ExportShipment,
    ShipmentMilestone,
)
from alsvid.models.partners import BusinessPartner

commercial_router = APIRouter(prefix="/api/v1/commercial", tags=["commercial"])
logistics_router = APIRouter(prefix="/api/v1/logistics", tags=["logistics"])
finance_router = APIRouter(prefix="/api/v1/finance", tags=["finance"])


def _money(value: str, *, allow_zero: bool = True) -> Decimal:
    try:
        amount = Decimal(value)
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid money value",
        ) from exc
    if amount < 0 or (not allow_zero and amount == 0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Money value must be positive" if not allow_zero else "Money value cannot be negative",
        )
    return amount.quantize(Decimal("0.01"))


def _currency(value: str) -> str:
    normalized = value.strip().upper()
    if len(normalized) != 3:
        raise HTTPException(status_code=422, detail="Currency must be a 3-letter code")
    return normalized


def _country(value: str) -> str:
    normalized = value.strip().upper()
    if len(normalized) != 2:
        raise HTTPException(status_code=422, detail="Country must be a 2-letter code")
    return normalized


def _dealer(db: Session, partner_id: str | None) -> BusinessPartner | None:
    if partner_id is None:
        return None
    partner = db.get(BusinessPartner, partner_id)
    if partner is None or not partner.active or not partner.is_dealer:
        raise HTTPException(status_code=422, detail="Dealer partner is invalid")
    return partner


def _partner(db: Session, partner_id: str | None) -> BusinessPartner | None:
    if partner_id is None:
        return None
    partner = db.get(BusinessPartner, partner_id)
    if partner is None or not partner.active:
        raise HTTPException(status_code=422, detail="Partner is invalid")
    return partner


def _commit(db: Session, *, conflict_detail: str) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=conflict_detail) from exc


class ChannelCreate(BaseModel):
    code: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=160)
    channel_type: str = Field(default="MANUAL", max_length=40)
    external_system: str | None = Field(default=None, max_length=60)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    countries: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrderFactCreate(BaseModel):
    external_system: str = Field(min_length=1, max_length=60)
    external_order_id: str = Field(min_length=1, max_length=160)
    channel_id: str | None = None
    dealer_partner_id: str | None = None
    business_mode: Literal["B2C", "B2B"] = "B2C"
    status: str = Field(default="CONFIRMED", max_length=32)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    gross_amount: str = "0"
    paid_amount: str = "0"
    refunded_amount: str = "0"
    ordered_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ShipmentCreate(BaseModel):
    shipment_no: str = Field(min_length=1, max_length=80)
    order_fact_id: str | None = None
    dealer_partner_id: str | None = None
    origin_country: str = Field(default="CN", min_length=2, max_length=2)
    destination_country: str = Field(min_length=2, max_length=2)
    destination_city: str | None = Field(default=None, max_length=120)
    transport_mode: str = Field(default="SEA", max_length=24)
    incoterm: str = Field(default="FOB", max_length=12)
    status: str = Field(default="PREPARING", max_length=32)
    carrier: str | None = Field(default=None, max_length=160)
    tracking_no: str | None = Field(default=None, max_length=160)
    export_customs_no: str | None = Field(default=None, max_length=160)
    import_customs_no: str | None = Field(default=None, max_length=160)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    declared_value: str = "0"
    freight_amount: str = "0"
    insurance_amount: str = "0"
    customs_amount: str = "0"
    import_vat_amount: str = "0"
    other_import_cost: str = "0"
    etd: datetime | None = None
    eta: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class MilestoneCreate(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    label: str | None = Field(default=None, max_length=160)
    location: str | None = Field(default=None, max_length=200)
    occurred_at: datetime | None = None
    note: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FinanceFactCreate(BaseModel):
    fact_type: str = Field(min_length=1, max_length=40)
    direction: Literal["RECEIVABLE", "PAYABLE", "INCOME", "EXPENSE"]
    source_type: str = Field(min_length=1, max_length=40)
    source_id: str = Field(min_length=1, max_length=80)
    partner_id: str | None = None
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    amount: str
    tax_amount: str = "0"
    occurred_at: datetime
    due_at: datetime | None = None
    status: str = Field(default="OPEN", max_length=24)
    metadata: dict[str, Any] = Field(default_factory=dict)


def _channel_dict(row: CommercialChannel) -> dict:
    return {"id": row.id, "code": row.code, "name": row.name, "channel_type": row.channel_type, "external_system": row.external_system, "currency": row.currency, "countries": row.countries, "status": row.status, "metadata": row.metadata_json}


def _order_fact_dict(row: CommercialOrderFact) -> dict:
    return {"id": row.id, "external_system": row.external_system, "external_order_id": row.external_order_id, "channel_id": row.channel_id, "dealer_partner_id": row.dealer_partner_id, "business_mode": row.business_mode, "status": row.status, "currency": row.currency, "gross_amount": row.gross_amount, "paid_amount": row.paid_amount, "refunded_amount": row.refunded_amount, "ordered_at": row.ordered_at, "confirmed_at": row.confirmed_at, "metadata": row.metadata_json}


def _shipment_dict(row: ExportShipment) -> dict:
    return {"id": row.id, "shipment_no": row.shipment_no, "order_fact_id": row.order_fact_id, "dealer_partner_id": row.dealer_partner_id, "origin_country": row.origin_country, "destination_country": row.destination_country, "destination_city": row.destination_city, "transport_mode": row.transport_mode, "incoterm": row.incoterm, "status": row.status, "carrier": row.carrier, "tracking_no": row.tracking_no, "export_customs_no": row.export_customs_no, "import_customs_no": row.import_customs_no, "currency": row.currency, "declared_value": row.declared_value, "freight_amount": row.freight_amount, "insurance_amount": row.insurance_amount, "customs_amount": row.customs_amount, "import_vat_amount": row.import_vat_amount, "other_import_cost": row.other_import_cost, "etd": row.etd, "eta": row.eta, "delivered_at": row.delivered_at, "metadata": row.metadata_json}


def _finance_fact_dict(row: CommercialFinanceFact) -> dict:
    return {"id": row.id, "fact_type": row.fact_type, "direction": row.direction, "source_type": row.source_type, "source_id": row.source_id, "partner_id": row.partner_id, "currency": row.currency, "amount": row.amount, "tax_amount": row.tax_amount, "occurred_at": row.occurred_at, "due_at": row.due_at, "status": row.status, "metadata": row.metadata_json}


@commercial_router.get("/channels")
def list_channels(_principal: Principal = Depends(permission_dependency("alsvid.finance.read")), db: Session = Depends(get_db)):
    rows = db.scalars(select(CommercialChannel).order_by(CommercialChannel.code)).all()
    return [_channel_dict(row) for row in rows]


@commercial_router.post("/channels", status_code=201)
def create_channel(payload: ChannelCreate, request: Request, principal: Principal = Depends(permission_dependency("alsvid.finance.write")), db: Session = Depends(get_db)):
    enforce_csrf(request, principal)
    row = CommercialChannel(code=payload.code.strip().upper(), name=payload.name.strip(), channel_type=payload.channel_type.strip().upper(), external_system=payload.external_system.strip().upper() if payload.external_system else None, currency=_currency(payload.currency), countries=list(dict.fromkeys(_country(value) for value in payload.countries)), metadata_json=payload.metadata)
    db.add(row)
    _commit(db, conflict_detail="Commercial channel code already exists")
    db.refresh(row)
    return _channel_dict(row)


@commercial_router.get("/order-facts")
def list_order_facts(_principal: Principal = Depends(permission_dependency("alsvid.finance.read")), db: Session = Depends(get_db)):
    rows = db.scalars(select(CommercialOrderFact).order_by(CommercialOrderFact.confirmed_at.desc())).all()
    return [_order_fact_dict(row) for row in rows]


@commercial_router.post("/order-facts", status_code=201)
def create_order_fact(payload: OrderFactCreate, request: Request, principal: Principal = Depends(permission_dependency("alsvid.finance.write")), db: Session = Depends(get_db)):
    enforce_csrf(request, principal)
    if payload.channel_id is not None and db.get(CommercialChannel, payload.channel_id) is None:
        raise HTTPException(status_code=422, detail="Commercial channel is invalid")
    if payload.business_mode == "B2B":
        _dealer(db, payload.dealer_partner_id)
        if payload.dealer_partner_id is None:
            raise HTTPException(status_code=422, detail="B2B order fact requires a dealer")
    elif payload.dealer_partner_id is not None:
        _dealer(db, payload.dealer_partner_id)
    row = CommercialOrderFact(external_system=payload.external_system.strip().upper(), external_order_id=payload.external_order_id.strip(), channel_id=payload.channel_id, dealer_partner_id=payload.dealer_partner_id, business_mode=payload.business_mode, status=payload.status.strip().upper(), currency=_currency(payload.currency), gross_amount=_money(payload.gross_amount), paid_amount=_money(payload.paid_amount), refunded_amount=_money(payload.refunded_amount), ordered_at=payload.ordered_at, metadata_json=payload.metadata)
    db.add(row)
    _commit(db, conflict_detail="External order fact already exists")
    db.refresh(row)
    return _order_fact_dict(row)


@logistics_router.get("/shipments")
def list_shipments(_principal: Principal = Depends(permission_dependency("alsvid.supply_chain.read")), db: Session = Depends(get_db)):
    rows = db.scalars(select(ExportShipment).order_by(ExportShipment.created_at.desc())).all()
    return [_shipment_dict(row) for row in rows]


@logistics_router.post("/shipments", status_code=201)
def create_shipment(payload: ShipmentCreate, request: Request, principal: Principal = Depends(permission_dependency("alsvid.supply_chain.write")), db: Session = Depends(get_db)):
    enforce_csrf(request, principal)
    if payload.order_fact_id is not None and db.get(CommercialOrderFact, payload.order_fact_id) is None:
        raise HTTPException(status_code=422, detail="Commercial order fact is invalid")
    _dealer(db, payload.dealer_partner_id)
    row = ExportShipment(shipment_no=payload.shipment_no.strip().upper(), order_fact_id=payload.order_fact_id, dealer_partner_id=payload.dealer_partner_id, origin_country=_country(payload.origin_country), destination_country=_country(payload.destination_country), destination_city=payload.destination_city.strip() if payload.destination_city else None, transport_mode=payload.transport_mode.strip().upper(), incoterm=payload.incoterm.strip().upper(), status=payload.status.strip().upper(), carrier=payload.carrier.strip() if payload.carrier else None, tracking_no=payload.tracking_no.strip() if payload.tracking_no else None, export_customs_no=payload.export_customs_no.strip() if payload.export_customs_no else None, import_customs_no=payload.import_customs_no.strip() if payload.import_customs_no else None, currency=_currency(payload.currency), declared_value=_money(payload.declared_value), freight_amount=_money(payload.freight_amount), insurance_amount=_money(payload.insurance_amount), customs_amount=_money(payload.customs_amount), import_vat_amount=_money(payload.import_vat_amount), other_import_cost=_money(payload.other_import_cost), etd=payload.etd, eta=payload.eta, metadata_json=payload.metadata)
    db.add(row)
    _commit(db, conflict_detail="Shipment number already exists")
    db.refresh(row)
    return _shipment_dict(row)


@logistics_router.post("/shipments/{shipment_id}/milestones", status_code=201)
def add_shipment_milestone(shipment_id: str, payload: MilestoneCreate, request: Request, principal: Principal = Depends(permission_dependency("alsvid.supply_chain.write")), db: Session = Depends(get_db)):
    enforce_csrf(request, principal)
    shipment = db.get(ExportShipment, shipment_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    occurred_at = payload.occurred_at or datetime.now(UTC)
    row = ShipmentMilestone(shipment_id=shipment.id, code=payload.code.strip().upper(), label=payload.label.strip() if payload.label else None, location=payload.location.strip() if payload.location else None, occurred_at=occurred_at, note=payload.note, metadata_json=payload.metadata)
    status_map = {"DEPARTED_CHINA": "IN_TRANSIT", "ARRIVED_EU": "ARRIVED_EU", "CUSTOMS_CLEARED": "CUSTOMS_CLEARED", "DELIVERED": "DELIVERED"}
    if row.code in status_map:
        shipment.status = status_map[row.code]
    if row.code == "DELIVERED":
        shipment.delivered_at = occurred_at
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "shipment_id": row.shipment_id, "code": row.code, "label": row.label, "location": row.location, "occurred_at": row.occurred_at, "note": row.note, "metadata": row.metadata_json, "shipment_status": shipment.status}


@finance_router.get("/facts")
def list_finance_facts(_principal: Principal = Depends(permission_dependency("alsvid.finance.read")), db: Session = Depends(get_db)):
    rows = db.scalars(select(CommercialFinanceFact).order_by(CommercialFinanceFact.occurred_at.desc())).all()
    return [_finance_fact_dict(row) for row in rows]


@finance_router.post("/facts", status_code=201)
def create_finance_fact(payload: FinanceFactCreate, request: Request, principal: Principal = Depends(permission_dependency("alsvid.finance.write")), db: Session = Depends(get_db)):
    enforce_csrf(request, principal)
    _partner(db, payload.partner_id)
    row = CommercialFinanceFact(fact_type=payload.fact_type.strip().upper(), direction=payload.direction, source_type=payload.source_type.strip().upper(), source_id=payload.source_id.strip(), partner_id=payload.partner_id, currency=_currency(payload.currency), amount=_money(payload.amount, allow_zero=False), tax_amount=_money(payload.tax_amount), occurred_at=payload.occurred_at, due_at=payload.due_at, status=payload.status.strip().upper(), metadata_json=payload.metadata)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _finance_fact_dict(row)
