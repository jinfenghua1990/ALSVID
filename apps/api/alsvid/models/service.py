from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class Warranty(Base):
    __tablename__ = "warranties"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("warranty"))
    vehicle_id: Mapped[str] = mapped_column(ForeignKey("vehicles.id"), unique=True, index=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", index=True)


class ServiceCase(Base):
    __tablename__ = "service_cases"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("service_case")
    )
    vehicle_id: Mapped[str] = mapped_column(ForeignKey("vehicles.id"), index=True)
    dealer_partner_id: Mapped[str | None] = mapped_column(
        ForeignKey("business_partners.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(30), default="OPEN", index=True)
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", index=True)
    issue_summary: Mapped[str] = mapped_column(String(300))
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ServiceCasePart(Base):
    __tablename__ = "service_case_parts"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("service_case_part")
    )
    service_case_id: Mapped[str] = mapped_column(ForeignKey("service_cases.id"), index=True)
    part_id: Mapped[str] = mapped_column(ForeignKey("parts.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    action: Mapped[str] = mapped_column(String(24), default="USED")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ServiceCaseStatusEvent(Base):
    __tablename__ = "service_case_status_events"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("service_status_event")
    )
    service_case_id: Mapped[str] = mapped_column(ForeignKey("service_cases.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    changed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
