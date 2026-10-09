from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class BusinessPartner(Base):
    __tablename__ = "business_partners"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("partner"))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    country_code: Mapped[str | None] = mapped_column(String(2), nullable=True, index=True)
    tax_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_customer: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_supplier: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_dealer: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_factory: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_service_provider: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BusinessPartnerIdentifier(Base):
    __tablename__ = "business_partner_identifiers"
    __table_args__ = (UniqueConstraint("partner_id", "kind", "normalized_text"),)

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("partner_identifier")
    )
    partner_id: Mapped[str] = mapped_column(ForeignKey("business_partners.id"), index=True)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    identifier_text: Mapped[str] = mapped_column(String(200))
    normalized_text: Mapped[str] = mapped_column(String(200), index=True)
    source: Mapped[str] = mapped_column(String(80), default="manual")
    confirmed: Mapped[bool] = mapped_column(Boolean, default=True)


class ExternalMapping(Base):
    """Maps external platform identities without making them ALSVID primary keys."""

    __tablename__ = "external_mappings"
    __table_args__ = (
        UniqueConstraint("system", "object_type", "external_id"),
        UniqueConstraint("system", "object_type", "internal_id"),
    )

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("external_mapping")
    )
    system: Mapped[str] = mapped_column(String(60), index=True)
    object_type: Mapped[str] = mapped_column(String(60), index=True)
    external_id: Mapped[str] = mapped_column(String(200), index=True)
    internal_id: Mapped[str] = mapped_column(String(80), index=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
