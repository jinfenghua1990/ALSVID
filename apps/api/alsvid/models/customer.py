from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class VehicleClaimToken(Base):
    __tablename__ = "vehicle_claim_tokens"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("vehicle_claim_token")
    )
    vehicle_id: Mapped[str] = mapped_column(ForeignKey("vehicles.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    claimed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MyAlsvidAccount(Base):
    __tablename__ = "my_alsvid_accounts"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    partner_id: Mapped[str] = mapped_column(
        ForeignKey("business_partners.id"), unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MarketingConsentEvent(Base):
    __tablename__ = "marketing_consent_events"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("marketing_consent_event")
    )
    partner_id: Mapped[str] = mapped_column(ForeignKey("business_partners.id"), index=True)
    channel: Mapped[str] = mapped_column(String(30), index=True)
    status: Mapped[str] = mapped_column(String(20), index=True)
    source: Mapped[str] = mapped_column(String(80))
    policy_version: Mapped[str] = mapped_column(String(80))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    recorded_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
