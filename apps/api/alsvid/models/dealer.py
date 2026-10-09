from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class DealerProfile(Base):
    __tablename__ = "dealer_profiles"

    partner_id: Mapped[str] = mapped_column(ForeignKey("business_partners.id"), primary_key=True)
    authorization_status: Mapped[str] = mapped_column(String(30), default="PENDING", index=True)
    service_capable: Mapped[bool] = mapped_column(Boolean, default=False)
    training_status: Mapped[str] = mapped_column(String(30), default="NOT_STARTED")
    territory: Mapped[str | None] = mapped_column(String(120), nullable=True)
    public_store_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class DealerPortalMember(Base):
    __tablename__ = "dealer_portal_members"
    __table_args__ = (UniqueConstraint("user_id", "dealer_partner_id"),)

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("dealer_portal_member")
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    dealer_partner_id: Mapped[str] = mapped_column(
        ForeignKey("dealer_profiles.partner_id"), index=True
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
