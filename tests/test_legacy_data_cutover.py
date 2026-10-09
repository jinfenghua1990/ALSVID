from datetime import UTC, date, datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from alsvid.bootstrap import bootstrap_reference_data
from alsvid.db import Base
from alsvid.migration.chaiben import LegacySnapshot, apply_snapshot, validate_snapshot
from alsvid.models import BicycleModel, BusinessPartner, Product, ProductPlatform, Vehicle


def _rows() -> dict[str, list[dict]]:
    now = datetime.now(UTC)
    return {
        "products": [
            {
                "id": "prd_legacy_fc1",
                "workspace_id": "ws_alsvid",
                "brand_id": "brand_alsvid",
                "code": "FC1-MIG",
                "name": "FC1 Migration Test",
                "product_type": "STANDARD",
                "active": True,
            }
        ],
        "skus": [],
        "alsvid_platforms": [
            {
                "id": "platform_legacy_fc",
                "code": "FC",
                "name": "Folding Carbon",
                "meaning": "Folding Carbon",
                "description": None,
                "active": True,
            }
        ],
        "alsvid_models": [
            {
                "id": "model_legacy_fc1",
                "platform_id": "platform_legacy_fc",
                "product_id": "prd_legacy_fc1",
                "code": "FC1-MIG",
                "name": "FC1 Migration Test",
                "generation": 1,
                "status": "ACTIVE",
                "frame_material": "Carbon",
                "wheel_size": "20",
                "motor_position": "MID",
                "notes": None,
                "released_at": now,
            }
        ],
        "alsvid_variants": [],
        "alsvid_parts": [],
        "alsvid_bom_items": [],
        "alsvid_bom_revisions": [
            {
                "id": "bomr_legacy_fc1_1",
                "model_id": "model_legacy_fc1",
                "revision_no": 1,
                "status": "RELEASED",
                "checksum": "a" * 64,
                "snapshot": [],
                "note": "",
                "released_by": None,
                "released_at": now,
            }
        ],
        "vehicles": [
            {
                "id": "veh_legacy_1",
                "model_id": "model_legacy_fc1",
                "frame_number": "ALS-FC1-MIG-0001",
                "sku_id": None,
                "customer_partner_id": "bp_customer_legacy",
                "dealer_partner_id": "bp_dealer_legacy",
                "bom_revision_id": "bomr_legacy_fc1_1",
                "build_snapshot": {
                    "model": {"code": "FC1-MIG"},
                    "bom_revision": {"revision_no": 1},
                },
                "production_batch": "202610-MIG",
                "factory_source": "CN-FACTORY",
                "production_completed_at": now,
                "factory_outbound_at": now,
                "factory_outbound_reference": "OUT-1",
                "status": "ACTIVE",
                "purchase_date": date(2026, 10, 1),
                "activated_at": now,
            }
        ],
        "vehicle_lifecycle_events": [
            {
                "id": "vevt_legacy_1",
                "vehicle_id": "veh_legacy_1",
                "sequence_no": 1,
                "event_type": "FACTORY_OUTBOUND",
                "occurred_at": now,
                "actor_id": None,
                "dealer_partner_id": None,
                "customer_partner_id": None,
                "reference_type": "FACTORY_OUTBOUND",
                "reference_id": "OUT-1",
                "note": "",
                "event_data": {},
            }
        ],
        "business_partners": [
            {
                "id": "bp_customer_legacy",
                "code": "C-MIG",
                "name": "Migration Customer",
                "country_code": "DE",
                "tax_id": None,
                "email": "customer@example.com",
                "phone": None,
                "notes": None,
                "is_customer": True,
                "is_supplier": False,
                "is_dealer": False,
                "is_service_provider": False,
                "active": True,
            },
            {
                "id": "bp_dealer_legacy",
                "code": "D-MIG",
                "name": "Migration Dealer",
                "country_code": "DE",
                "tax_id": None,
                "email": "dealer@example.com",
                "phone": None,
                "notes": None,
                "is_customer": False,
                "is_supplier": False,
                "is_dealer": True,
                "is_service_provider": True,
                "active": True,
            },
        ],
        "business_partner_identifiers": [],
        "users": [],
        "user_auth_credentials": [],
        "roles": [],
        "user_workspace_roles": [],
        "warranties": [
            {
                "id": "war_legacy_1",
                "vehicle_id": "veh_legacy_1",
                "start_date": date(2026, 10, 1),
                "end_date": date(2028, 10, 1),
                "status": "ACTIVE",
            }
        ],
        "service_cases": [
            {
                "id": "svc_legacy_1",
                "vehicle_id": "veh_legacy_1",
                "dealer_partner_id": "bp_dealer_legacy",
                "status": "OPEN",
                "priority": "NORMAL",
                "issue_summary": "Migration test",
                "diagnosis": None,
                "resolution": None,
                "opened_at": now,
                "closed_at": None,
            }
        ],
        "service_case_parts": [],
        "service_case_status_events": [],
        "assets": [],
        "dealer_profiles": [
            {
                "partner_id": "bp_dealer_legacy",
                "authorization_status": "APPROVED",
                "service_capable": True,
                "training_status": "COMPLETED",
                "public_store_name": "Migration Dealer",
                "notes": None,
            }
        ],
        "dealer_portal_members": [],
        "vehicle_claim_tokens": [],
        "my_alsvid_accounts": [],
        "alsvid_marketing_consent_events": [],
    }


def _target_engine():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        bootstrap_reference_data(db)
    return engine


def test_cutover_blocks_vehicle_without_frozen_birth_evidence() -> None:
    rows = _rows()
    rows["vehicles"][0]["bom_revision_id"] = None
    rows["vehicles"][0]["build_snapshot"] = {}
    report = validate_snapshot(LegacySnapshot(rows=rows, workspace_id="ws_alsvid"))
    assert report.ready is False
    assert any("no frozen BOM revision" in message for message in report.blockers)
    assert any("no build snapshot" in message for message in report.blockers)


def test_cutover_dry_run_rolls_back_apply_is_idempotent_and_maps_reference_ids() -> None:
    engine = _target_engine()
    snapshot = LegacySnapshot(rows=_rows(), workspace_id="ws_alsvid")

    dry_run = apply_snapshot(snapshot, engine, apply=False)
    assert dry_run.ready is True
    assert any("dry-run only" in message for message in dry_run.warnings)
    with Session(engine) as db:
        assert db.scalar(select(Product).where(Product.code == "FC1-MIG")) is None

    applied = apply_snapshot(snapshot, engine, apply=True)
    assert applied.ready is True
    with Session(engine) as db:
        product = db.get(Product, "prd_legacy_fc1")
        model = db.get(BicycleModel, "model_legacy_fc1")
        vehicle = db.get(Vehicle, "veh_legacy_1")
        customer = db.get(BusinessPartner, "bp_customer_legacy")
        platform = db.scalar(select(ProductPlatform).where(ProductPlatform.code == "FC"))
        assert product is not None and product.product_type == "BICYCLE"
        assert model is not None and platform is not None and model.platform_id == platform.id
        assert vehicle is not None
        assert vehicle.current_customer_partner_id == customer.id
        assert vehicle.current_dealer_partner_id == "bp_dealer_legacy"
        assert vehicle.bom_revision_id == "bomr_legacy_fc1_1"

    rerun = apply_snapshot(snapshot, engine, apply=True)
    assert rerun.ready is True
    assert rerun.inserted_counts.get("vehicles", 0) == 0
    assert rerun.existing_counts.get("vehicles", 0) == 1
