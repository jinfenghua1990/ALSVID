"""Standalone ALSVID schema baseline.

Revision ID: 20261009_0001
Revises: None
Create Date: 2026-10-09
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20261009_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _index(table: str, column: str, *, unique: bool = False) -> None:
    op.create_index(f"ix_{table}_{column}", table, [column], unique=unique)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("users", "email", unique=True)
    _index("users", "active")

    op.create_table(
        "roles",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
    )
    _index("roles", "code", unique=True)

    op.create_table(
        "permissions",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
    )
    _index("permissions", "code", unique=True)

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("role_id", sa.String(40), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("permission_id", sa.String(40), sa.ForeignKey("permissions.id"), nullable=False),
        sa.UniqueConstraint("role_id", "permission_id"),
    )
    _index("role_permissions", "role_id")
    _index("role_permissions", "permission_id")

    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(40), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role_id", sa.String(40), sa.ForeignKey("roles.id"), nullable=False),
        sa.UniqueConstraint("user_id", "role_id"),
    )
    _index("user_roles", "user_id")
    _index("user_roles", "role_id")

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("actor_id", sa.String(40), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(160), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("audit_events", "actor_id")
    _index("audit_events", "action")
    _index("audit_events", "entity_type")
    _index("audit_events", "entity_id")

    op.create_table(
        "user_auth_credentials",
        sa.Column("user_id", sa.String(40), sa.ForeignKey("users.id"), primary_key=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("failed_attempts", sa.Integer(), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(40), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("csrf_token", sa.String(96), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    _index("auth_sessions", "user_id")
    _index("auth_sessions", "token_hash", unique=True)
    _index("auth_sessions", "expires_at")

    op.create_table(
        "business_partners",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("country_code", sa.String(2), nullable=True),
        sa.Column("tax_id", sa.String(80), nullable=True),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("phone", sa.String(80), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_customer", sa.Boolean(), nullable=False),
        sa.Column("is_supplier", sa.Boolean(), nullable=False),
        sa.Column("is_dealer", sa.Boolean(), nullable=False),
        sa.Column("is_factory", sa.Boolean(), nullable=False),
        sa.Column("is_service_provider", sa.Boolean(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("business_partners", "code", unique=True)
    _index("business_partners", "name")
    _index("business_partners", "country_code")
    _index("business_partners", "is_customer")
    _index("business_partners", "is_supplier")
    _index("business_partners", "is_dealer")
    _index("business_partners", "is_factory")
    _index("business_partners", "is_service_provider")
    _index("business_partners", "active")

    op.create_table(
        "business_partner_identifiers",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=False),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("identifier_text", sa.String(200), nullable=False),
        sa.Column("normalized_text", sa.String(200), nullable=False),
        sa.Column("source", sa.String(80), nullable=False),
        sa.Column("confirmed", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("partner_id", "kind", "normalized_text"),
    )
    _index("business_partner_identifiers", "partner_id")
    _index("business_partner_identifiers", "kind")
    _index("business_partner_identifiers", "normalized_text")

    op.create_table(
        "external_mappings",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("system", sa.String(60), nullable=False),
        sa.Column("object_type", sa.String(60), nullable=False),
        sa.Column("external_id", sa.String(200), nullable=False),
        sa.Column("internal_id", sa.String(80), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("system", "object_type", "external_id"),
        sa.UniqueConstraint("system", "object_type", "internal_id"),
    )
    _index("external_mappings", "system")
    _index("external_mappings", "object_type")
    _index("external_mappings", "external_id")
    _index("external_mappings", "internal_id")

    op.create_table(
        "products",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("product_type", sa.String(40), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
    )
    _index("products", "code", unique=True)
    _index("products", "product_type")
    _index("products", "active")

    op.create_table(
        "skus",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("product_id", sa.String(40), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("barcode", sa.String(100), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("product_id", "code"),
        sa.UniqueConstraint("barcode"),
    )
    _index("skus", "product_id")
    _index("skus", "code", unique=True)
    _index("skus", "active")

    op.create_table(
        "product_platforms",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("meaning", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
    )
    _index("product_platforms", "code", unique=True)
    _index("product_platforms", "active")

    op.create_table(
        "bicycle_models",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("platform_id", sa.String(40), sa.ForeignKey("product_platforms.id"), nullable=False),
        sa.Column("product_id", sa.String(40), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("frame_material", sa.String(120), nullable=True),
        sa.Column("wheel_size", sa.String(80), nullable=True),
        sa.Column("motor_position", sa.String(80), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("bicycle_models", "platform_id")
    _index("bicycle_models", "product_id", unique=True)
    _index("bicycle_models", "code", unique=True)
    _index("bicycle_models", "status")

    op.create_table(
        "bicycle_variants",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("model_id", sa.String(40), sa.ForeignKey("bicycle_models.id"), nullable=False),
        sa.Column("sku_id", sa.String(40), sa.ForeignKey("skus.id"), nullable=False),
        sa.Column("edition", sa.String(80), nullable=True),
        sa.Column("color", sa.String(80), nullable=True),
        sa.Column("market", sa.String(20), nullable=True),
        sa.Column("status", sa.String(24), nullable=False),
        sa.UniqueConstraint("model_id", "sku_id"),
    )
    _index("bicycle_variants", "model_id")
    _index("bicycle_variants", "sku_id", unique=True)
    _index("bicycle_variants", "market")
    _index("bicycle_variants", "status")

    op.create_table(
        "parts",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("sku_id", sa.String(40), sa.ForeignKey("skus.id"), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("manufacturer_part_no", sa.String(120), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("sku_id"),
    )
    _index("parts", "code", unique=True)
    _index("parts", "category")
    _index("parts", "active")

    op.create_table(
        "bom_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("model_id", sa.String(40), sa.ForeignKey("bicycle_models.id"), nullable=False),
        sa.Column("part_id", sa.String(40), sa.ForeignKey("parts.id"), nullable=False),
        sa.Column("position_code", sa.String(40), nullable=False),
        sa.Column("callout", sa.String(80), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.UniqueConstraint("model_id", "part_id", "position_code"),
    )
    _index("bom_items", "model_id")
    _index("bom_items", "part_id")

    op.create_table(
        "bom_revisions",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("model_id", sa.String(40), sa.ForeignKey("bicycle_models.id"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("released_by", sa.String(40), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("model_id", "revision_no"),
    )
    _index("bom_revisions", "model_id")
    _index("bom_revisions", "status")
    _index("bom_revisions", "checksum")

    op.create_table(
        "vehicles",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("model_id", sa.String(40), sa.ForeignKey("bicycle_models.id"), nullable=False),
        sa.Column("frame_number", sa.String(120), nullable=False),
        sa.Column("sku_id", sa.String(40), sa.ForeignKey("skus.id"), nullable=True),
        sa.Column("current_customer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True),
        sa.Column("current_dealer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True),
        sa.Column("bom_revision_id", sa.String(40), sa.ForeignKey("bom_revisions.id"), nullable=False),
        sa.Column("build_snapshot", sa.JSON(), nullable=False),
        sa.Column("production_batch", sa.String(120), nullable=True),
        sa.Column("factory_source", sa.String(200), nullable=True),
        sa.Column("production_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("factory_outbound_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("factory_outbound_reference", sa.String(120), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("vehicles", "model_id")
    _index("vehicles", "frame_number", unique=True)
    _index("vehicles", "sku_id")
    _index("vehicles", "current_customer_partner_id")
    _index("vehicles", "current_dealer_partner_id")
    _index("vehicles", "bom_revision_id")
    _index("vehicles", "production_batch")
    _index("vehicles", "factory_outbound_at")
    _index("vehicles", "status")

    op.create_table(
        "vehicle_lifecycle_events",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("vehicle_id", sa.String(40), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actor_id", sa.String(40), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("dealer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True),
        sa.Column("customer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True),
        sa.Column("reference_type", sa.String(40), nullable=True),
        sa.Column("reference_id", sa.String(80), nullable=True),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("event_data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("vehicle_id", "sequence_no"),
    )
    _index("vehicle_lifecycle_events", "vehicle_id")
    _index("vehicle_lifecycle_events", "event_type")
    _index("vehicle_lifecycle_events", "occurred_at")
    _index("vehicle_lifecycle_events", "dealer_partner_id")
    _index("vehicle_lifecycle_events", "customer_partner_id")

    op.create_table(
        "dealer_profiles",
        sa.Column("partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), primary_key=True, nullable=False),
        sa.Column("authorization_status", sa.String(30), nullable=False),
        sa.Column("service_capable", sa.Boolean(), nullable=False),
        sa.Column("training_status", sa.String(30), nullable=False),
        sa.Column("territory", sa.String(120), nullable=True),
        sa.Column("public_store_name", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    _index("dealer_profiles", "authorization_status")

    op.create_table(
        "dealer_portal_members",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(40), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("dealer_partner_id", sa.String(40), sa.ForeignKey("dealer_profiles.partner_id"), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "dealer_partner_id"),
    )
    _index("dealer_portal_members", "user_id")
    _index("dealer_portal_members", "dealer_partner_id")
    _index("dealer_portal_members", "active")

    op.create_table(
        "vehicle_claim_tokens",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("vehicle_id", sa.String(40), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("issued_by", sa.String(40), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("claimed_by", sa.String(40), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("vehicle_claim_tokens", "vehicle_id")
    _index("vehicle_claim_tokens", "token_hash", unique=True)
    _index("vehicle_claim_tokens", "expires_at")

    op.create_table(
        "my_alsvid_accounts",
        sa.Column("user_id", sa.String(40), sa.ForeignKey("users.id"), primary_key=True, nullable=False),
        sa.Column("partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("my_alsvid_accounts", "partner_id", unique=True)

    op.create_table(
        "marketing_consent_events",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=False),
        sa.Column("channel", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("source", sa.String(80), nullable=False),
        sa.Column("policy_version", sa.String(80), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recorded_by_user_id", sa.String(40), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("marketing_consent_events", "partner_id")
    _index("marketing_consent_events", "channel")
    _index("marketing_consent_events", "status")
    _index("marketing_consent_events", "occurred_at")

    op.create_table(
        "warranties",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("vehicle_id", sa.String(40), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
    )
    _index("warranties", "vehicle_id", unique=True)
    _index("warranties", "status")

    op.create_table(
        "service_cases",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("vehicle_id", sa.String(40), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("dealer_partner_id", sa.String(40), sa.ForeignKey("business_partners.id"), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("priority", sa.String(20), nullable=False),
        sa.Column("issue_summary", sa.String(300), nullable=False),
        sa.Column("diagnosis", sa.Text(), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    _index("service_cases", "vehicle_id")
    _index("service_cases", "dealer_partner_id")
    _index("service_cases", "status")
    _index("service_cases", "priority")

    op.create_table(
        "service_case_parts",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("service_case_id", sa.String(40), sa.ForeignKey("service_cases.id"), nullable=False),
        sa.Column("part_id", sa.String(40), sa.ForeignKey("parts.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(24), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("service_case_parts", "service_case_id")
    _index("service_case_parts", "part_id")

    op.create_table(
        "service_case_status_events",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("service_case_id", sa.String(40), sa.ForeignKey("service_cases.id"), nullable=False),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("changed_by", sa.String(40), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    _index("service_case_status_events", "service_case_id")
    _index("service_case_status_events", "to_status")

    op.create_table(
        "assets",
        sa.Column("id", sa.String(40), primary_key=True, nullable=False),
        sa.Column("owner_type", sa.String(30), nullable=False),
        sa.Column("owner_id", sa.String(40), nullable=False),
        sa.Column("asset_type", sa.String(30), nullable=False),
        sa.Column("purpose", sa.String(100), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column("visibility", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("storage_key"),
    )
    _index("assets", "owner_type")
    _index("assets", "owner_id")
    _index("assets", "asset_type")
    _index("assets", "sha256")
    _index("assets", "visibility")


def downgrade() -> None:
    for table in (
        "assets",
        "service_case_status_events",
        "service_case_parts",
        "service_cases",
        "warranties",
        "marketing_consent_events",
        "my_alsvid_accounts",
        "vehicle_claim_tokens",
        "dealer_portal_members",
        "dealer_profiles",
        "vehicle_lifecycle_events",
        "vehicles",
        "bom_revisions",
        "bom_items",
        "parts",
        "bicycle_variants",
        "bicycle_models",
        "product_platforms",
        "skus",
        "products",
        "external_mappings",
        "business_partner_identifiers",
        "business_partners",
        "auth_sessions",
        "user_auth_credentials",
        "audit_events",
        "user_roles",
        "role_permissions",
        "permissions",
        "roles",
        "users",
    ):
        op.drop_table(table)
