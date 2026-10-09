from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("vehicle"))
    model_id: Mapped[str] = mapped_column(ForeignKey("bicycle_models.id"), index=True)
    frame_number: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    sku_id: Mapped[str | None] = mapped_column(ForeignKey("skus.id"), nullable=True, index=True)
    current_customer_partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    current_dealer_partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    bom_revision_id: Mapped[str] = mapped_column(ForeignKey("bom_revisions.id"), index=True)
    build_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    production_batch: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    factory_source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    production_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    factory_outbound_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    factory_outbound_reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="REGISTERED", index=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VehicleLifecycleEvent(Base):
    __tablename__ = "vehicle_lifecycle_events"
    __table_args__ = (UniqueConstraint("vehicle_id", "sequence_no"),)

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("vehicle_event")
    )
    vehicle_id: Mapped[str] = mapped_column(ForeignKey("vehicles.id"), index=True)
    sequence_no: Mapped[int] = mapped_column(Integer)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    dealer_partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    customer_partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    reference_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    event_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
