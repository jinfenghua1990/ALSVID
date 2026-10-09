from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, enforce_csrf, permission_dependency
from alsvid.db import get_db
from alsvid.models.commercial import ExportShipment
from alsvid.models.partners import BusinessPartner

router = APIRouter(prefix="/api/v1/logistics", tags=["logistics"])


def _decimal(value: str, *, scale: str = "0.01") -> Decimal:
    try:
        result = Decimal(value)
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Invalid numeric value") from exc
    if result < 0:
        raise HTTPException(status_code=422, detail="Numeric value cannot be negative")
    return result.quantize(Decimal(scale))


class ShipmentComplianceUpdate(BaseModel):
    importer_kind: Literal["EXTERNAL_CUSTOMER", "DEALER", "OWN_ENTITY", "AGENT"] = (
        "EXTERNAL_CUSTOMER"
    )
    importer_partner_id: str | None = None
    booking_no: str | None = Field(default=None, max_length=160)
    bill_of_lading_no: str | None = Field(default=None, max_length=160)
    container_no: str | None = Field(default=None, max_length=160)
    commercial_invoice_no: str | None = Field(default=None, max_length=160)
    eori_no: str | None = Field(default=None, max_length=80)
    hs_code: str | None = Field(default=None, max_length=32)
    cn_code: str | None = Field(default=None, max_length=32)
    manufacturer_name: str | None = Field(default=None, max_length=240)
    taric_additional_code: str | None = Field(default=None, max_length=32)
    tax_rate_source: str | None = None
    tax_rate_checked_at: datetime | None = None
    quantity: str = "0"
    customs_rate: str = "0"
    anti_dumping_rate: str = "0"
    countervailing_rate: str = "0"
    import_vat_rate: str = "0"
    import_vat_recoverable: bool = True
    import_vat_additional_base: str = "0"
    clearance_fee: str = "0"
    port_fee: str = "0"
    last_mile_fee: str = "0"
    export_purchase_cost_cny: str = "0"
    domestic_export_cost_cny: str = "0"
    export_refund_base_cny: str = "0"
    export_refund_rate: str = "0"
    actual_export_refund_cny: str = "0"
    export_refund_status: str = Field(default="PENDING", max_length=24)
    export_refund_received_at: datetime | None = None
    eur_to_cny: str = "1"


def _payload(row: ExportShipment) -> dict:
    fields = (
        "importer_kind",
        "importer_partner_id",
        "booking_no",
        "bill_of_lading_no",
        "container_no",
        "commercial_invoice_no",
        "eori_no",
        "hs_code",
        "cn_code",
        "manufacturer_name",
        "taric_additional_code",
        "tax_rate_source",
        "tax_rate_checked_at",
        "quantity",
        "customs_rate",
        "anti_dumping_rate",
        "countervailing_rate",
        "import_vat_rate",
        "import_vat_recoverable",
        "import_vat_additional_base",
        "clearance_fee",
        "port_fee",
        "last_mile_fee",
        "export_purchase_cost_cny",
        "domestic_export_cost_cny",
        "export_refund_base_cny",
        "export_refund_rate",
        "actual_export_refund_cny",
        "export_refund_status",
        "export_refund_received_at",
        "eur_to_cny",
        "departed_at",
        "arrived_eu_at",
        "customs_cleared_at",
        "delivered_at",
    )
    return {field: getattr(row, field) for field in fields}


@router.get("/shipments/{shipment_id}/compliance")
def shipment_compliance(
    shipment_id: str,
    _principal: Principal = Depends(permission_dependency("alsvid.supply_chain.read")),
    db: Session = Depends(get_db),
):
    row = db.get(ExportShipment, shipment_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return _payload(row)


@router.put("/shipments/{shipment_id}/compliance")
def update_shipment_compliance(
    shipment_id: str,
    payload: ShipmentComplianceUpdate,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.supply_chain.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    row = db.get(ExportShipment, shipment_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if payload.importer_partner_id is not None:
        partner = db.get(BusinessPartner, payload.importer_partner_id)
        if partner is None or not partner.active:
            raise HTTPException(status_code=422, detail="Importer partner is invalid")
        if payload.importer_kind == "DEALER" and not partner.is_dealer:
            raise HTTPException(status_code=422, detail="Dealer importer must be a dealer partner")
    elif payload.importer_kind in {"DEALER", "OWN_ENTITY", "AGENT"}:
        raise HTTPException(status_code=422, detail="Importer partner is required for this importer kind")

    text_fields = (
        "booking_no",
        "bill_of_lading_no",
        "container_no",
        "commercial_invoice_no",
        "eori_no",
        "hs_code",
        "cn_code",
        "manufacturer_name",
        "taric_additional_code",
        "tax_rate_source",
    )
    for field in text_fields:
        value = getattr(payload, field)
        setattr(row, field, value.strip() if value else None)

    row.importer_kind = payload.importer_kind
    row.importer_partner_id = payload.importer_partner_id
    row.tax_rate_checked_at = payload.tax_rate_checked_at
    row.quantity = _decimal(payload.quantity, scale="0.0001")
    row.customs_rate = _decimal(payload.customs_rate, scale="0.000001")
    row.anti_dumping_rate = _decimal(payload.anti_dumping_rate, scale="0.000001")
    row.countervailing_rate = _decimal(payload.countervailing_rate, scale="0.000001")
    row.import_vat_rate = _decimal(payload.import_vat_rate, scale="0.000001")
    row.import_vat_recoverable = payload.import_vat_recoverable
    row.import_vat_additional_base = _decimal(payload.import_vat_additional_base)
    row.clearance_fee = _decimal(payload.clearance_fee)
    row.port_fee = _decimal(payload.port_fee)
    row.last_mile_fee = _decimal(payload.last_mile_fee)
    row.export_purchase_cost_cny = _decimal(payload.export_purchase_cost_cny)
    row.domestic_export_cost_cny = _decimal(payload.domestic_export_cost_cny)
    row.export_refund_base_cny = _decimal(payload.export_refund_base_cny)
    row.export_refund_rate = _decimal(payload.export_refund_rate, scale="0.000001")
    row.actual_export_refund_cny = _decimal(payload.actual_export_refund_cny)
    row.export_refund_status = payload.export_refund_status.strip().upper()
    row.export_refund_received_at = payload.export_refund_received_at
    row.eur_to_cny = _decimal(payload.eur_to_cny, scale="0.000001")
    if row.eur_to_cny <= 0:
        raise HTTPException(status_code=422, detail="EUR to CNY rate must be positive")
    db.commit()
    db.refresh(row)
    return _payload(row)
