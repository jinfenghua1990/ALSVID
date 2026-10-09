from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Iterable

from sqlalchemy import MetaData, Table, and_, create_engine, select
from sqlalchemy.engine import Connection, Engine


class LegacyMigrationError(RuntimeError):
    pass


@dataclass
class MigrationReport:
    workspace_id: str | None = None
    source_counts: dict[str, int] = field(default_factory=dict)
    planned_counts: dict[str, int] = field(default_factory=dict)
    inserted_counts: dict[str, int] = field(default_factory=dict)
    existing_counts: dict[str, int] = field(default_factory=dict)
    blockers: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ready(self) -> bool:
        return not self.blockers

    def as_dict(self) -> dict[str, Any]:
        return {
            "workspace_id": self.workspace_id,
            "source_counts": self.source_counts,
            "planned_counts": self.planned_counts,
            "inserted_counts": self.inserted_counts,
            "existing_counts": self.existing_counts,
            "blockers": self.blockers,
            "warnings": self.warnings,
            "ready": self.ready,
        }


@dataclass
class LegacySnapshot:
    rows: dict[str, list[dict[str, Any]]]
    workspace_id: str
    platform_id_map: dict[str, str] = field(default_factory=dict)

    def ids(self, table_name: str, key: str = "id") -> set[str]:
        return {str(row[key]) for row in self.rows.get(table_name, []) if row.get(key) is not None}


_REQUIRED_SOURCE = {
    "workspaces",
    "products",
    "skus",
    "alsvid_platforms",
    "alsvid_models",
    "alsvid_variants",
    "alsvid_parts",
    "alsvid_bom_items",
    "alsvid_bom_revisions",
    "vehicles",
    "vehicle_lifecycle_events",
    "business_partners",
    "users",
    "roles",
    "user_workspace_roles",
    "user_auth_credentials",
    "warranties",
    "service_cases",
    "assets",
}

_OPTIONAL_SOURCE = {
    "business_partner_identifiers",
    "dealer_profiles",
    "dealer_portal_members",
    "vehicle_claim_tokens",
    "my_alsvid_accounts",
    "alsvid_marketing_consent_events",
    "service_case_parts",
    "service_case_status_events",
}

_REQUIRED_TARGET = {
    "products",
    "skus",
    "product_platforms",
    "bicycle_models",
    "bicycle_variants",
    "parts",
    "bom_items",
    "bom_revisions",
    "vehicles",
    "vehicle_lifecycle_events",
    "business_partners",
    "business_partner_identifiers",
    "users",
    "roles",
    "user_roles",
    "user_auth_credentials",
    "warranties",
    "service_cases",
    "service_case_parts",
    "service_case_status_events",
    "assets",
    "dealer_profiles",
    "dealer_portal_members",
    "vehicle_claim_tokens",
    "my_alsvid_accounts",
    "marketing_consent_events",
}


def _reflect(engine: Engine, names: Iterable[str], *, required: set[str]) -> dict[str, Table]:
    inspector_metadata = MetaData()
    wanted = set(names)
    inspector_metadata.reflect(bind=engine, only=lambda name, _metadata: name in wanted)
    missing = sorted(required - set(inspector_metadata.tables))
    if missing:
        raise LegacyMigrationError(f"database is missing required tables: {', '.join(missing)}")
    return dict(inspector_metadata.tables)


def _all_rows(conn: Connection, table: Table) -> list[dict[str, Any]]:
    return [dict(row._mapping) for row in conn.execute(select(table)).all()]


def _rows_where(conn: Connection, table: Table, criterion) -> list[dict[str, Any]]:
    return [dict(row._mapping) for row in conn.execute(select(table).where(criterion)).all()]


def _table_rows_by_ids(
    conn: Connection,
    table: Table,
    ids: set[str],
    *,
    id_column: str = "id",
) -> list[dict[str, Any]]:
    if not ids:
        return []
    return _rows_where(conn, table, table.c[id_column].in_(ids))


def _find_alsvid_workspace(conn: Connection, workspaces: Table) -> str:
    matches = conn.execute(
        select(workspaces.c.id).where(workspaces.c.code == "ALSVID")
    ).scalars().all()
    if len(matches) != 1:
        raise LegacyMigrationError(
            f"expected exactly one ALSVID workspace, found {len(matches)}"
        )
    return str(matches[0])


def build_legacy_snapshot(source_engine: Engine) -> LegacySnapshot:
    source = _reflect(
        source_engine,
        _REQUIRED_SOURCE | _OPTIONAL_SOURCE,
        required=_REQUIRED_SOURCE,
    )
    rows: dict[str, list[dict[str, Any]]] = {}

    with source_engine.connect() as conn:
        workspace_id = _find_alsvid_workspace(conn, source["workspaces"])
        products = _rows_where(
            conn,
            source["products"],
            source["products"].c.workspace_id == workspace_id,
        )
        product_ids = {str(row["id"]) for row in products}
        skus = _table_rows_by_ids(conn, source["skus"], product_ids, id_column="product_id")
        sku_ids = {str(row["id"]) for row in skus}

        platforms = _all_rows(conn, source["alsvid_platforms"])
        models = _all_rows(conn, source["alsvid_models"])
        variants = _all_rows(conn, source["alsvid_variants"])
        parts = _all_rows(conn, source["alsvid_parts"])
        bom_items = _all_rows(conn, source["alsvid_bom_items"])
        bom_revisions = _all_rows(conn, source["alsvid_bom_revisions"])
        vehicles = _all_rows(conn, source["vehicles"])
        lifecycle = _all_rows(conn, source["vehicle_lifecycle_events"])
        warranties = _all_rows(conn, source["warranties"])
        service_cases = _all_rows(conn, source["service_cases"])

        model_product_ids = {str(row["product_id"]) for row in models}
        extra_product_ids = model_product_ids - product_ids
        if extra_product_ids:
            raise LegacyMigrationError(
                "ALSVID models reference products outside the ALSVID workspace: "
                + ", ".join(sorted(extra_product_ids))
            )

        referenced_sku_ids = {
            str(value)
            for value in (
                *[row.get("sku_id") for row in variants],
                *[row.get("sku_id") for row in parts],
                *[row.get("sku_id") for row in vehicles],
            )
            if value is not None
        }
        outside_sku_ids = referenced_sku_ids - sku_ids
        if outside_sku_ids:
            raise LegacyMigrationError(
                "ALSVID facts reference SKUs outside the ALSVID workspace: "
                + ", ".join(sorted(outside_sku_ids))
            )

        dealer_profiles = (
            _all_rows(conn, source["dealer_profiles"])
            if "dealer_profiles" in source
            else []
        )
        dealer_members = (
            _all_rows(conn, source["dealer_portal_members"])
            if "dealer_portal_members" in source
            else []
        )
        claim_tokens = (
            _all_rows(conn, source["vehicle_claim_tokens"])
            if "vehicle_claim_tokens" in source
            else []
        )
        my_accounts = (
            _all_rows(conn, source["my_alsvid_accounts"])
            if "my_alsvid_accounts" in source
            else []
        )
        consent_events = (
            _all_rows(conn, source["alsvid_marketing_consent_events"])
            if "alsvid_marketing_consent_events" in source
            else []
        )
        service_parts = (
            _all_rows(conn, source["service_case_parts"])
            if "service_case_parts" in source
            else []
        )
        service_status_events = (
            _all_rows(conn, source["service_case_status_events"])
            if "service_case_status_events" in source
            else []
        )

        vehicle_ids = {str(row["id"]) for row in vehicles}
        partner_ids: set[str] = {
            str(value)
            for value in (
                *[row.get("customer_partner_id") for row in vehicles],
                *[row.get("dealer_partner_id") for row in vehicles],
                *[row.get("customer_partner_id") for row in lifecycle],
                *[row.get("dealer_partner_id") for row in lifecycle],
                *[row.get("dealer_partner_id") for row in service_cases],
                *[row.get("partner_id") for row in dealer_profiles],
                *[row.get("partner_id") for row in my_accounts],
                *[row.get("partner_id") for row in consent_events],
            )
            if value is not None
        }
        partners = _table_rows_by_ids(conn, source["business_partners"], partner_ids)
        partner_identifiers = (
            _table_rows_by_ids(
                conn,
                source["business_partner_identifiers"],
                partner_ids,
                id_column="partner_id",
            )
            if "business_partner_identifiers" in source
            else []
        )

        workspace_roles = _rows_where(
            conn,
            source["user_workspace_roles"],
            source["user_workspace_roles"].c.workspace_id == workspace_id,
        )
        user_ids: set[str] = {
            str(row["user_id"]) for row in workspace_roles
        } | {
            str(value)
            for value in (
                *[row.get("actor_id") for row in lifecycle],
                *[row.get("released_by") for row in bom_revisions],
                *[row.get("issued_by") for row in claim_tokens],
                *[row.get("claimed_by") for row in claim_tokens],
                *[row.get("user_id") for row in my_accounts],
                *[row.get("recorded_by_user_id") for row in consent_events],
                *[row.get("changed_by") for row in service_status_events],
                *[row.get("user_id") for row in dealer_members],
            )
            if value is not None
        }
        users = _table_rows_by_ids(conn, source["users"], user_ids)
        credentials = _table_rows_by_ids(
            conn,
            source["user_auth_credentials"],
            user_ids,
            id_column="user_id",
        )
        role_ids = {str(row["role_id"]) for row in workspace_roles}
        roles = _table_rows_by_ids(conn, source["roles"], role_ids)

        all_assets = _all_rows(conn, source["assets"])
        owner_ids_by_type = {
            "PRODUCT": product_ids,
            "SKU": sku_ids,
            "MODEL": {str(row["id"]) for row in models},
            "PART": {str(row["id"]) for row in parts},
            "BOM_REVISION": {str(row["id"]) for row in bom_revisions},
            "VEHICLE": vehicle_ids,
        }
        assets = [
            row
            for row in all_assets
            if str(row.get("owner_id"))
            in owner_ids_by_type.get(str(row.get("owner_type", "")).upper(), set())
        ]

        rows.update(
            {
                "products": products,
                "skus": skus,
                "alsvid_platforms": platforms,
                "alsvid_models": models,
                "alsvid_variants": variants,
                "alsvid_parts": parts,
                "alsvid_bom_items": bom_items,
                "alsvid_bom_revisions": bom_revisions,
                "vehicles": vehicles,
                "vehicle_lifecycle_events": lifecycle,
                "business_partners": partners,
                "business_partner_identifiers": partner_identifiers,
                "users": users,
                "user_auth_credentials": credentials,
                "roles": roles,
                "user_workspace_roles": workspace_roles,
                "warranties": warranties,
                "service_cases": service_cases,
                "service_case_parts": service_parts,
                "service_case_status_events": service_status_events,
                "assets": assets,
                "dealer_profiles": dealer_profiles,
                "dealer_portal_members": dealer_members,
                "vehicle_claim_tokens": claim_tokens,
                "my_alsvid_accounts": my_accounts,
                "alsvid_marketing_consent_events": consent_events,
            }
        )

    return LegacySnapshot(rows=rows, workspace_id=workspace_id)


def validate_snapshot(snapshot: LegacySnapshot) -> MigrationReport:
    report = MigrationReport(workspace_id=snapshot.workspace_id)
    report.source_counts = {name: len(rows) for name, rows in snapshot.rows.items()}
    report.planned_counts = dict(report.source_counts)

    vehicle_rows = snapshot.rows["vehicles"]
    normalized_frames: dict[str, str] = {}
    for row in vehicle_rows:
        frame = str(row.get("frame_number") or "").strip().upper()
        if not frame:
            report.blockers.append(f"vehicle {row.get('id')} has an empty frame number")
            continue
        previous = normalized_frames.get(frame)
        if previous and previous != row["id"]:
            report.blockers.append(
                f"duplicate normalized frame number {frame}: {previous}, {row['id']}"
            )
        normalized_frames[frame] = str(row["id"])
        if row.get("bom_revision_id") is None:
            report.blockers.append(
                f"vehicle {frame} has no frozen BOM revision; birth configuration must be repaired before cutover"
            )
        if not row.get("build_snapshot"):
            report.blockers.append(
                f"vehicle {frame} has no build snapshot; birth configuration must be repaired before cutover"
            )

    vehicle_ids = snapshot.ids("vehicles")
    sequences: set[tuple[str, int]] = set()
    for row in snapshot.rows["vehicle_lifecycle_events"]:
        vehicle_id = str(row["vehicle_id"])
        if vehicle_id not in vehicle_ids:
            report.blockers.append(
                f"lifecycle event {row['id']} references missing vehicle {vehicle_id}"
            )
        pair = (vehicle_id, int(row["sequence_no"]))
        if pair in sequences:
            report.blockers.append(
                f"vehicle {vehicle_id} has duplicate lifecycle sequence {row['sequence_no']}"
            )
        sequences.add(pair)

    model_ids = snapshot.ids("alsvid_models")
    revision_ids = snapshot.ids("alsvid_bom_revisions")
    part_ids = snapshot.ids("alsvid_parts")
    partner_ids = snapshot.ids("business_partners")
    user_ids = snapshot.ids("users")
    case_ids = snapshot.ids("service_cases")

    def require_ref(
        rows: Iterable[dict[str, Any]],
        column: str,
        valid: set[str],
        label: str,
        *,
        nullable: bool = True,
    ) -> None:
        for row in rows:
            value = row.get(column)
            if value is None and nullable:
                continue
            if value is None or str(value) not in valid:
                report.blockers.append(
                    f"{label} {row.get('id', '<row>')} references missing {column}={value}"
                )

    require_ref(vehicle_rows, "model_id", model_ids, "vehicle", nullable=False)
    require_ref(vehicle_rows, "bom_revision_id", revision_ids, "vehicle", nullable=False)
    require_ref(vehicle_rows, "customer_partner_id", partner_ids, "vehicle")
    require_ref(vehicle_rows, "dealer_partner_id", partner_ids, "vehicle")
    require_ref(snapshot.rows["vehicle_lifecycle_events"], "customer_partner_id", partner_ids, "event")
    require_ref(snapshot.rows["vehicle_lifecycle_events"], "dealer_partner_id", partner_ids, "event")
    require_ref(snapshot.rows["vehicle_lifecycle_events"], "actor_id", user_ids, "event")
    require_ref(snapshot.rows["service_cases"], "vehicle_id", vehicle_ids, "service case", nullable=False)
    require_ref(snapshot.rows["service_cases"], "dealer_partner_id", partner_ids, "service case")
    require_ref(snapshot.rows["service_case_parts"], "service_case_id", case_ids, "service part", nullable=False)
    require_ref(snapshot.rows["service_case_parts"], "part_id", part_ids, "service part", nullable=False)
    require_ref(snapshot.rows["warranties"], "vehicle_id", vehicle_ids, "warranty", nullable=False)
    require_ref(snapshot.rows["dealer_profiles"], "partner_id", partner_ids, "dealer profile", nullable=False)
    require_ref(snapshot.rows["my_alsvid_accounts"], "partner_id", partner_ids, "My ALSVID account", nullable=False)
    require_ref(snapshot.rows["my_alsvid_accounts"], "user_id", user_ids, "My ALSVID account", nullable=False)

    return report


def _target_tables(target_engine: Engine) -> dict[str, Table]:
    return _reflect(target_engine, _REQUIRED_TARGET, required=_REQUIRED_TARGET)


def _filtered_row(target: Table, row: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in row.items() if key in target.c}


def _one_by(conn: Connection, table: Table, **values: Any) -> dict[str, Any] | None:
    criteria = [table.c[key] == value for key, value in values.items()]
    row = conn.execute(select(table).where(and_(*criteria)).limit(1)).mappings().first()
    return dict(row) if row is not None else None


def _values_equal(left: Any, right: Any) -> bool:
    if isinstance(left, datetime) and isinstance(right, datetime):
        if left.tzinfo is None:
            left = left.replace(tzinfo=UTC)
        else:
            left = left.astimezone(UTC)
        if right.tzinfo is None:
            right = right.replace(tzinfo=UTC)
        else:
            right = right.astimezone(UTC)
    return left == right


def _insert_or_validate(
    conn: Connection,
    table: Table,
    row: dict[str, Any],
    report: MigrationReport,
    *,
    key_columns: tuple[str, ...],
    natural_key: tuple[str, ...] | None = None,
    compare_columns: tuple[str, ...] | None = None,
) -> None:
    row = _filtered_row(table, row)
    lookup = {key: row[key] for key in key_columns}
    existing = _one_by(conn, table, **lookup)
    if existing is None and natural_key:
        natural_lookup = {key: row[key] for key in natural_key}
        existing = _one_by(conn, table, **natural_lookup)
        if existing is not None and any(
            not _values_equal(existing.get(key), row.get(key)) for key in key_columns
        ):
            raise LegacyMigrationError(
                f"{table.name} business-key conflict for {natural_lookup}: "
                "target stable key differs from source"
            )
    if existing is not None:
        columns = compare_columns or tuple(row)
        mismatches = {
            key: (existing.get(key), row.get(key))
            for key in columns
            if key in row and not _values_equal(existing.get(key), row.get(key))
        }
        if mismatches:
            raise LegacyMigrationError(
                f"{table.name} conflict for {lookup}: {mismatches}"
            )
        report.existing_counts[table.name] = report.existing_counts.get(table.name, 0) + 1
        return
    conn.execute(table.insert().values(**row))
    report.inserted_counts[table.name] = report.inserted_counts.get(table.name, 0) + 1


def _ensure_platform_map(
    conn: Connection,
    target: dict[str, Table],
    snapshot: LegacySnapshot,
    report: MigrationReport,
) -> dict[str, str]:
    table = target["product_platforms"]
    mapping: dict[str, str] = {}
    for source_row in snapshot.rows["alsvid_platforms"]:
        existing = _one_by(conn, table, code=source_row["code"])
        if existing is None:
            row = _filtered_row(table, source_row)
            conn.execute(table.insert().values(**row))
            mapping[str(source_row["id"])] = str(source_row["id"])
            report.inserted_counts[table.name] = report.inserted_counts.get(table.name, 0) + 1
        else:
            mapping[str(source_row["id"])] = str(existing["id"])
            report.existing_counts[table.name] = report.existing_counts.get(table.name, 0) + 1
    return mapping


def _role_maps(
    conn: Connection,
    target: dict[str, Table],
    snapshot: LegacySnapshot,
) -> tuple[dict[str, str], dict[str, str]]:
    source_role_code = {str(row["id"]): str(row["code"]) for row in snapshot.rows["roles"]}
    target_rows = conn.execute(select(target["roles"])).mappings().all()
    target_role_id = {str(row["code"]): str(row["id"]) for row in target_rows}
    return source_role_code, target_role_id


def apply_snapshot(
    snapshot: LegacySnapshot,
    target_engine: Engine,
    *,
    apply: bool = False,
) -> MigrationReport:
    report = validate_snapshot(snapshot)
    if not report.ready:
        return report
    target = _target_tables(target_engine)

    with target_engine.begin() as conn:
        snapshot.platform_id_map = _ensure_platform_map(conn, target, snapshot, report)
        source_role_code, target_role_id = _role_maps(conn, target, snapshot)
        if not target_role_id:
            raise LegacyMigrationError(
                "standalone roles are missing; run `python -m alsvid.bootstrap` before cutover"
            )

        def migrate(
            source_name: str,
            target_name: str,
            *,
            transform=lambda row: dict(row),
            key_columns=("id",),
            natural_key=None,
        ) -> None:
            for source_row in snapshot.rows.get(source_name, []):
                _insert_or_validate(
                    conn,
                    target[target_name],
                    transform(source_row),
                    report,
                    key_columns=key_columns,
                    natural_key=natural_key,
                )

        migrate("users", "users", natural_key=("email",))
        migrate(
            "user_auth_credentials",
            "user_auth_credentials",
            key_columns=("user_id",),
        )
        migrate(
            "business_partners",
            "business_partners",
            transform=lambda row: {**row, "is_factory": False},
            natural_key=("code",),
        )
        migrate(
            "business_partner_identifiers",
            "business_partner_identifiers",
            natural_key=("partner_id", "kind", "normalized_text"),
        )

        model_product_ids = {
            str(row["product_id"]) for row in snapshot.rows["alsvid_models"]
        }
        migrate(
            "products",
            "products",
            transform=lambda row: {
                **row,
                "product_type": "BICYCLE"
                if str(row["id"]) in model_product_ids
                else row.get("product_type", "STANDARD"),
            },
            natural_key=("code",),
        )
        migrate("skus", "skus", natural_key=("code",))

        migrate(
            "alsvid_models",
            "bicycle_models",
            transform=lambda row: {
                **row,
                "platform_id": snapshot.platform_id_map[str(row["platform_id"])],
            },
            natural_key=("code",),
        )
        migrate(
            "alsvid_variants",
            "bicycle_variants",
            transform=lambda row: {**row, "market": None},
            natural_key=("model_id", "sku_id"),
        )
        migrate("alsvid_parts", "parts", natural_key=("code",))

        for source_row in snapshot.rows["alsvid_bom_items"]:
            row = dict(source_row)
            row.pop("id", None)
            _insert_or_validate(
                conn,
                target["bom_items"],
                row,
                report,
                key_columns=("model_id", "part_id", "position_code"),
                natural_key=("model_id", "part_id", "position_code"),
            )
        migrate(
            "alsvid_bom_revisions",
            "bom_revisions",
            natural_key=("model_id", "revision_no"),
        )
        migrate(
            "dealer_profiles",
            "dealer_profiles",
            transform=lambda row: {**row, "territory": None},
            key_columns=("partner_id",),
        )
        migrate(
            "vehicles",
            "vehicles",
            transform=lambda row: {
                **row,
                "current_customer_partner_id": row.get("customer_partner_id"),
                "current_dealer_partner_id": row.get("dealer_partner_id"),
            },
            natural_key=("frame_number",),
        )
        migrate("vehicle_lifecycle_events", "vehicle_lifecycle_events")
        migrate("warranties", "warranties", natural_key=("vehicle_id",))
        migrate("service_cases", "service_cases")
        migrate("service_case_parts", "service_case_parts")
        migrate("service_case_status_events", "service_case_status_events")
        migrate("assets", "assets", natural_key=("storage_key",))
        migrate("vehicle_claim_tokens", "vehicle_claim_tokens", natural_key=("token_hash",))
        migrate(
            "my_alsvid_accounts",
            "my_alsvid_accounts",
            key_columns=("user_id",),
            natural_key=("partner_id",),
        )
        migrate(
            "alsvid_marketing_consent_events",
            "marketing_consent_events",
        )
        migrate("dealer_portal_members", "dealer_portal_members")

        for role_row in snapshot.rows["user_workspace_roles"]:
            source_code = source_role_code.get(str(role_row["role_id"]))
            if source_code is None:
                raise LegacyMigrationError(
                    f"source role {role_row['role_id']} cannot be resolved"
                )
            target_id = target_role_id.get(source_code)
            if target_id is None:
                report.warnings.append(
                    f"source role {source_code} has no standalone equivalent and was not assigned"
                )
                continue
            _insert_or_validate(
                conn,
                target["user_roles"],
                {"user_id": role_row["user_id"], "role_id": target_id},
                report,
                key_columns=("user_id", "role_id"),
                natural_key=("user_id", "role_id"),
            )

        buyer_role = target_role_id.get("ALSVID_BUYER")
        dealer_role = target_role_id.get("ALSVID_DEALER")
        if buyer_role:
            for row in snapshot.rows["my_alsvid_accounts"]:
                _insert_or_validate(
                    conn,
                    target["user_roles"],
                    {"user_id": row["user_id"], "role_id": buyer_role},
                    report,
                    key_columns=("user_id", "role_id"),
                    natural_key=("user_id", "role_id"),
                )
        if dealer_role:
            for row in snapshot.rows["dealer_portal_members"]:
                _insert_or_validate(
                    conn,
                    target["user_roles"],
                    {"user_id": row["user_id"], "role_id": dealer_role},
                    report,
                    key_columns=("user_id", "role_id"),
                    natural_key=("user_id", "role_id"),
                )

        if not apply:
            conn.rollback()
            report.inserted_counts = {}
            report.warnings.append("dry-run only: target transaction was rolled back")

    return report


def migrate_database_urls(
    *,
    source_url: str,
    target_url: str,
    apply: bool = False,
) -> MigrationReport:
    if source_url == target_url:
        raise LegacyMigrationError("source and target database URLs must be different")
    source_engine = create_engine(source_url)
    target_engine = create_engine(target_url)
    try:
        snapshot = build_legacy_snapshot(source_engine)
        return apply_snapshot(snapshot, target_engine, apply=apply)
    finally:
        source_engine.dispose()
        target_engine.dispose()
