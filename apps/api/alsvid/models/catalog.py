from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from alsvid.db import Base
from alsvid.ids import new_id


class Product(Base):
    """Canonical ALSVID product identity without the legacy Workspace dimension."""

    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("product"))
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    product_type: Mapped[str] = mapped_column(String(40), default="BICYCLE", index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class SKU(Base):
    """Operational variant identity; valuation/pricing belong to their own domains."""

    __tablename__ = "skus"
    __table_args__ = (UniqueConstraint("product_id", "code"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: new_id("sku"))
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    barcode: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
