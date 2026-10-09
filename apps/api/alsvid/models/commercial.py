from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class CommercialChannel(Base):
    __tablename__ = "commercial_channels"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("commercial_channel")
    )
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    channel_type: Mapped[str] = mapped_column(String(40), default="MANUAL", index=True)
    external_system: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    countries: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE", index=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CommercialOrderFact(Base):
    __tablename__ = "commercial_order_facts"
    __table_args__ = (UniqueConstraint("external_system", "external_order_id"),)

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("commercial_order_fact")
    )
    external_system: Mapped[str] = mapped_column(String(60), index=True)
    external_order_id: Mapped[str] = mapped_column(String(160), index=True)
    channel_id: Mapped[str | None] = mapped_column(
        ForeignKey("commercial_channels.id"), nullable=True, index=True
    )
    dealer_partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    business_mode: Mapped[str] = mapped_column(String(12), default="B2C", index=True)
    status: Mapped[str] = mapped_column(String(32), default="CONFIRMED", index=True)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    refunded_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    ordered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class ExportShipment(Base):
    __tablename__ = "export_shipments"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("export_shipment")
    )
    shipment_no: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    order_fact_id: Mapped[str | None] = mapped_column(
        ForeignKey("commercial_order_facts.id"), nullable=True, index=True
    )
    dealer_partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    importer_kind: Mapped[str] = mapped_column(String(24), default="EXTERNAL_CUSTOMER", index=True)
    importer_partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    origin_country: Mapped[str] = mapped_column(String(2), default="CN")
    destination_country: Mapped[str] = mapped_column(String(2), index=True)
    destination_city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    transport_mode: Mapped[str] = mapped_column(String(24), default="SEA", index=True)
    incoterm: Mapped[str] = mapped_column(String(12), default="FOB")
    status: Mapped[str] = mapped_column(String(32), default="PREPARING", index=True)
    carrier: Mapped[str | None] = mapped_column(String(160), nullable=True)
    booking_no: Mapped[str | None] = mapped_column(String(160), nullable=True)
    bill_of_lading_no: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    container_no: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    tracking_no: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    export_customs_no: Mapped[str | None] = mapped_column(String(160), nullable=True)
    import_customs_no: Mapped[str | None] = mapped_column(String(160), nullable=True)
    commercial_invoice_no: Mapped[str | None] = mapped_column(String(160), nullable=True)
    eori_no: Mapped[str | None] = mapped_column(String(80), nullable=True)
    hs_code: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    cn_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    manufacturer_name: Mapped[str | None] = mapped_column(String(240), nullable=True)
    taric_additional_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tax_rate_source: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_rate_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    declared_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    freight_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    insurance_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    customs_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    customs_rate: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0"))
    anti_dumping_rate: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0"))
    countervailing_rate: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0"))
    import_vat_rate: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0"))
    import_vat_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    import_vat_recoverable: Mapped[bool] = mapped_column(Boolean, default=True)
    import_vat_additional_base: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    clearance_fee: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    port_fee: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    last_mile_fee: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    other_import_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    export_purchase_cost_cny: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    domestic_export_cost_cny: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    export_refund_base_cny: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    export_refund_rate: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0"))
    actual_export_refund_cny: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    export_refund_status: Mapped[str] = mapped_column(String(24), default="PENDING", index=True)
    export_refund_received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    eur_to_cny: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("1"))
    etd: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    eta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    arrived_eu_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    customs_cleared_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ShipmentMilestone(Base):
    __tablename__ = "shipment_milestones"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("shipment_milestone")
    )
    shipment_id: Mapped[str] = mapped_column(ForeignKey("export_shipments.id"), index=True)
    code: Mapped[str] = mapped_column(String(40), index=True)
    label: Mapped[str | None] = mapped_column(String(160), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class CommercialFinanceFact(Base):
    __tablename__ = "commercial_finance_facts"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("commercial_finance_fact")
    )
    fact_type: Mapped[str] = mapped_column(String(40), index=True)
    direction: Mapped[str] = mapped_column(String(12), index=True)
    source_type: Mapped[str] = mapped_column(String(40), index=True)
    source_id: Mapped[str] = mapped_column(String(80), index=True)
    partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="OPEN", index=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
