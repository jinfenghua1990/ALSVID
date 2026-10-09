from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class InventoryLocation(Base):
    __tablename__ = "inventory_locations"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("inventory_location")
    )
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    location_type: Mapped[str] = mapped_column(String(32), default="WAREHOUSE", index=True)
    country_code: Mapped[str] = mapped_column(String(2), index=True)
    partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("inventory_movement")
    )
    location_id: Mapped[str] = mapped_column(ForeignKey("inventory_locations.id"), index=True)
    sku_id: Mapped[str] = mapped_column(ForeignKey("skus.id"), index=True)
    quantity_delta: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    movement_type: Mapped[str] = mapped_column(String(32), index=True)
    reference_type: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    reference_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DealerInventoryReservation(Base):
    __tablename__ = "dealer_inventory_reservations"
    __table_args__ = (
        UniqueConstraint("external_system", "external_id", name="uq_dealer_reservation_external"),
    )

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("dealer_inventory_reservation")
    )
    dealer_partner_id: Mapped[str] = mapped_column(ForeignKey("business_partners.id"), index=True)
    location_id: Mapped[str] = mapped_column(ForeignKey("inventory_locations.id"), index=True)
    sku_id: Mapped[str] = mapped_column(ForeignKey("skus.id"), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    reservation_kind: Mapped[str] = mapped_column(String(24), default="QUOTE", index=True)
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE", index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    external_system: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    external_id: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
