"""Add ALSVID export commercial, logistics and finance facts.

Revision ID: 20261009_0002
Revises: 20261009_0001
Create Date: 2026-10-09
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20261009_0002"
down_revision: str | None = "20261009_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _index(table: str, column: str, *, unique: bool = False) -> None:
    op.create_index(f"ix_{table}_{column}", table, [column], unique=unique)


def upgrade() -> None:
    op.create_table("commercial_channels", sa.Column("id", sa.String(40), primary_key=True, nullable=False), sa.Column("code", sa.String(60), nullable=False), sa.Column("name", sa.String(160), nullable=False), sa.Column("channel_type", sa.String(40), nullable=False), sa.Column("external_system", sa.String(60), nullable=True), sa.Column("currency", sa.String(3), nullable=False), sa.Column("countries", sa.JSON(), nullable=False), sa.Column("status", sa.String(24), nullable=False), sa.Column("metadata_json", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    _index("commercial_channels", "code", unique=True)
    _index("commercial_channels", "channel_type")
    _index("commercial_channels", "external_system")
    _index("commercial_channels", "status")

    op.create_table("commercial_order_facts", sa.Column("id", sa.String(40), primary_key=True, nullable=False), sa.Column("external_system", sa.String(60), nullable=False), sa.Column("external_order_id", sa.String(160), nullable=False), sa.Column("channel_id", sa.String(40), sa.ForeignKey("commercial_channels.id"), nullable=True), sa.Column("dealer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True), sa.Column("business_mode", sa.String(12), nullable=False), sa.Column("status", sa.String(32), nullable=False), sa.Column("currency", sa.String(3), nullable=False), sa.Column("gross_amount", sa.Numeric(18, 2), nullable=False), sa.Column("paid_amount", sa.Numeric(18, 2), nullable=False), sa.Column("refunded_amount", sa.Numeric(18, 2), nullable=False), sa.Column("ordered_at", sa.DateTime(timezone=True), nullable=True), sa.Column("confirmed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("metadata_json", sa.JSON(), nullable=False), sa.UniqueConstraint("external_system", "external_order_id"))
    for column in ("external_system", "external_order_id", "channel_id", "dealer_partner_id", "business_mode", "status"):
        _index("commercial_order_facts", column)

    op.create_table("export_shipments", sa.Column("id", sa.String(40), primary_key=True, nullable=False), sa.Column("shipment_no", sa.String(80), nullable=False), sa.Column("order_fact_id", sa.String(40), sa.ForeignKey("commercial_order_facts.id"), nullable=True), sa.Column("dealer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True), sa.Column("origin_country", sa.String(2), nullable=False), sa.Column("destination_country", sa.String(2), nullable=False), sa.Column("destination_city", sa.String(120), nullable=True), sa.Column("transport_mode", sa.String(24), nullable=False), sa.Column("incoterm", sa.String(12), nullable=False), sa.Column("status", sa.String(32), nullable=False), sa.Column("carrier", sa.String(160), nullable=True), sa.Column("tracking_no", sa.String(160), nullable=True), sa.Column("export_customs_no", sa.String(160), nullable=True), sa.Column("import_customs_no", sa.String(160), nullable=True), sa.Column("currency", sa.String(3), nullable=False), sa.Column("declared_value", sa.Numeric(18, 2), nullable=False), sa.Column("freight_amount", sa.Numeric(18, 2), nullable=False), sa.Column("insurance_amount", sa.Numeric(18, 2), nullable=False), sa.Column("customs_amount", sa.Numeric(18, 2), nullable=False), sa.Column("import_vat_amount", sa.Numeric(18, 2), nullable=False), sa.Column("other_import_cost", sa.Numeric(18, 2), nullable=False), sa.Column("etd", sa.DateTime(timezone=True), nullable=True), sa.Column("eta", sa.DateTime(timezone=True), nullable=True), sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True), sa.Column("metadata_json", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    _index("export_shipments", "shipment_no", unique=True)
    for column in ("order_fact_id", "dealer_partner_id", "destination_country", "transport_mode", "status", "tracking_no"):
        _index("export_shipments", column)

    op.create_table("shipment_milestones", sa.Column("id", sa.String(40), primary_key=True, nullable=False), sa.Column("shipment_id", sa.String(40), sa.ForeignKey("export_shipments.id"), nullable=False), sa.Column("code", sa.String(40), nullable=False), sa.Column("label", sa.String(160), nullable=True), sa.Column("location", sa.String(200), nullable=True), sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False), sa.Column("note", sa.Text(), nullable=True), sa.Column("metadata_json", sa.JSON(), nullable=False))
    for column in ("shipment_id", "code", "occurred_at"):
        _index("shipment_milestones", column)

    op.create_table("commercial_finance_facts", sa.Column("id", sa.String(40), primary_key=True, nullable=False), sa.Column("fact_type", sa.String(40), nullable=False), sa.Column("direction", sa.String(12), nullable=False), sa.Column("source_type", sa.String(40), nullable=False), sa.Column("source_id", sa.String(80), nullable=False), sa.Column("partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True), sa.Column("currency", sa.String(3), nullable=False), sa.Column("amount", sa.Numeric(18, 2), nullable=False), sa.Column("tax_amount", sa.Numeric(18, 2), nullable=False), sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False), sa.Column("due_at", sa.DateTime(timezone=True), nullable=True), sa.Column("status", sa.String(24), nullable=False), sa.Column("metadata_json", sa.JSON(), nullable=False))
    for column in ("fact_type", "direction", "source_type", "source_id", "partner_id", "occurred_at", "status"):
        _index("commercial_finance_facts", column)


def downgrade() -> None:
    op.drop_table("commercial_finance_facts")
    op.drop_table("shipment_milestones")
    op.drop_table("export_shipments")
    op.drop_table("commercial_order_facts")
    op.drop_table("commercial_channels")
