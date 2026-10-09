from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class ProductPlatform(Base):
    __tablename__ = "product_platforms"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("platform"))
    code: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    meaning: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class BicycleModel(Base):
    __tablename__ = "bicycle_models"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("model"))
    platform_id: Mapped[str] = mapped_column(ForeignKey("product_platforms.id"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    generation: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(24), default="DRAFT", index=True)
    frame_material: Mapped[str | None] = mapped_column(String(120), nullable=True)
    wheel_size: Mapped[str | None] = mapped_column(String(80), nullable=True)
    motor_position: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BicycleVariant(Base):
    __tablename__ = "bicycle_variants"
    __table_args__ = (UniqueConstraint("model_id", "sku_id"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("variant"))
    model_id: Mapped[str] = mapped_column(ForeignKey("bicycle_models.id"), index=True)
    sku_id: Mapped[str] = mapped_column(ForeignKey("skus.id"), unique=True, index=True)
    edition: Mapped[str | None] = mapped_column(String(80), nullable=True)
    color: Mapped[str | None] = mapped_column(String(80), nullable=True)
    market: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE", index=True)


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("part"))
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    sku_id: Mapped[str | None] = mapped_column(ForeignKey("skus.id"), nullable=True, unique=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    manufacturer_part_no: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class BomItem(Base):
    __tablename__ = "bom_items"
    __table_args__ = (UniqueConstraint("model_id", "part_id", "position_code"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    model_id: Mapped[str] = mapped_column(ForeignKey("bicycle_models.id"), index=True)
    part_id: Mapped[str] = mapped_column(ForeignKey("parts.id"), index=True)
    position_code: Mapped[str] = mapped_column(String(40))
    callout: Mapped[str | None] = mapped_column(String(80), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)


class BomRevision(Base):
    __tablename__ = "bom_revisions"
    __table_args__ = (UniqueConstraint("model_id", "revision_no"),)

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("bom_revision")
    )
    model_id: Mapped[str] = mapped_column(ForeignKey("bicycle_models.id"), index=True)
    revision_no: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(24), default="RELEASED", index=True)
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    snapshot: Mapped[list] = mapped_column(JSON, default=list)
    note: Mapped[str] = mapped_column(Text, default="")
    released_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    released_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
