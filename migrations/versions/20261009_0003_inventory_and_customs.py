"""Add ALSVID inventory reservations and export compliance fields.

Revision ID: 20261009_0003
Revises: 20261009_0002
Create Date: 2026-10-09
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20261009_0003"
down_revision: str | None = "20261009_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _index(table: str, column: str, *, unique: bool = False) -> None:
    op.create_index(f"ix_{table}_{column}", table, [column], unique=unique)


def upgrade() -> None:
    op.create_table(
        "inventory_locations",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("code", sa.String(60), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("location_type", sa.String(32), nullable=False),
        sa.Column("country_code", sa.String(2), nullable=False),
        sa.Column("partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("inventory_locations", "code", unique=True)
    for column in ("location_type", "country_code", "partner_id", "active"):
        _index("inventory_locations", column)

    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("location_id", sa.String(40), sa.ForeignKey("inventory_locations.id"), nullable=False),
        sa.Column("sku_id", sa.String(40), sa.ForeignKey("skus.id"), nullable=False),
        sa.Column("quantity_delta", sa.Numeric(18, 4), nullable=False),
        sa.Column("movement_type", sa.String(32), nullable=False),
        sa.Column("reference_type", sa.String(40), nullable=True),
        sa.Column("reference_id", sa.String(120), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    for column in ("location_id", "sku_id", "movement_type", "reference_type", "reference_id", "occurred_at"):
        _index("inventory_movements", column)

    op.create_table(
        "dealer_inventory_reservations",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("dealer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=False),
        sa.Column("location_id", sa.String(40), sa.ForeignKey("inventory_locations.id"), nullable=False),
        sa.Column("sku_id", sa.String(40), sa.ForeignKey("skus.id"), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("reservation_kind", sa.String(24), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("external_system", sa.String(60), nullable=True),
        sa.Column("external_id", sa.String(160), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("external_system", "external_id", name="uq_dealer_reservation_external"),
    )
    for column in (
        "dealer_partner_id",
        "location_id",
        "sku_id",
        "reservation_kind",
        "status",
        "starts_at",
        "expires_at",
        "external_system",
        "external_id",
    ):
        _index("dealer_inventory_reservations", column)

    columns = [
        sa.Column("importer_kind", sa.String(24), nullable=False, server_default="EXTERNAL_CUSTOMER"),
        sa.Column("importer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True),
        sa.Column("booking_no", sa.String(160), nullable=True),
        sa.Column("bill_of_lading_no", sa.String(160), nullable=True),
        sa.Column("container_no", sa.String(160), nullable=True),
        sa.Column("commercial_invoice_no", sa.String(160), nullable=True),
        sa.Column("eori_no", sa.String(80), nullable=True),
        sa.Column("hs_code", sa.String(32), nullable=True),
        sa.Column("cn_code", sa.String(32), nullable=True),
        sa.Column("manufacturer_name", sa.String(240), nullable=True),
        sa.Column("taric_additional_code", sa.String(32), nullable=True),
        sa.Column("tax_rate_source", sa.Text(), nullable=True),
        sa.Column("tax_rate_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("quantity", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("customs_rate", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("anti_dumping_rate", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("countervailing_rate", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("import_vat_rate", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("import_vat_recoverable", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("import_vat_additional_base", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("clearance_fee", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("port_fee", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("last_mile_fee", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("export_purchase_cost_cny", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("domestic_export_cost_cny", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("export_refund_base_cny", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("export_refund_rate", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("actual_export_refund_cny", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("export_refund_status", sa.String(24), nullable=False, server_default="PENDING"),
        sa.Column("export_refund_received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("eur_to_cny", sa.Numeric(18, 6), nullable=False, server_default="1"),
        sa.Column("departed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("arrived_eu_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("customs_cleared_at", sa.DateTime(timezone=True), nullable=True),
    ]
    with op.batch_alter_table("export_shipments") as batch_op:
        for column in columns:
            batch_op.add_column(column)
    for column in (
        "importer_kind",
        "importer_partner_id",
        "bill_of_lading_no",
        "container_no",
        "hs_code",
        "export_refund_status",
    ):
        _index("export_shipments", column)


def downgrade() -> None:
    for column in (
        "export_refund_status",
        "hs_code",
        "container_no",
        "bill_of_lading_no",
        "importer_partner_id",
        "importer_kind",
    ):
        op.drop_index(f"ix_export_shipments_{column}", table_name="export_shipments")
    columns = (
        "customs_cleared_at",
        "arrived_eu_at",
        "departed_at",
        "eur_to_cny",
        "export_refund_received_at",
        "export_refund_status",
        "actual_export_refund_cny",
        "export_refund_rate",
        "export_refund_base_cny",
        "domestic_export_cost_cny",
        "export_purchase_cost_cny",
        "last_mile_fee",
        "port_fee",
        "clearance_fee",
        "import_vat_additional_base",
        "import_vat_recoverable",
        "import_vat_rate",
        "countervailing_rate",
        "anti_dumping_rate",
        "customs_rate",
        "quantity",
        "tax_rate_checked_at",
        "tax_rate_source",
        "taric_additional_code",
        "manufacturer_name",
        "cn_code",
        "hs_code",
        "eori_no",
        "commercial_invoice_no",
        "container_no",
        "bill_of_lading_no",
        "booking_no",
        "importer_partner_id",
        "importer_kind",
    )
    with op.batch_alter_table("export_shipments") as batch_op:
        for column in columns:
            batch_op.drop_column(column)
    op.drop_table("dealer_inventory_reservations")
    op.drop_table("inventory_movements")
    op.drop_table("inventory_locations")
