import hashlib
import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from alsvid.ids import new_id
from alsvid.models.assets import Asset
from alsvid.models.catalog import SKU, Product
from alsvid.models.core import AuditEvent
from alsvid.models.engineering import (
    BicycleModel,
    BicycleVariant,
    BomItem,
    BomRevision,
    Part,
    ProductPlatform,
)
from alsvid.models.service import ServiceCase
from alsvid.models.vehicle import Vehicle

FIXED_PLATFORM_CODES = {"FC", "FT", "CT", "GT"}
ASSET_TYPES = {
    "PRODUCT_IMAGE",
    "DETAIL_IMAGE",
    "EXPLODED_VIEW",
    "MANUAL",
    "SERVICE_DOC",
    "DEALER_DOC",
    "MODEL_3D",
    "VIDEO",
}
ASSET_VISIBILITIES = {"INTERNAL", "SERVICE", "DEALER", "CUSTOMER", "PUBLIC"}


class EngineeringError(ValueError):
    pass


def _audit(
    db: Session,
    *,
    actor_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str,
) -> None:
    db.add(
        AuditEvent(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )


def create_product(
    db: Session,
    *,
    code: str,
    name: str,
    product_type: str = "BICYCLE",
) -> Product:
    normalized_code = code.strip().upper()
    normalized_name = name.strip()
    if not normalized_code or not normalized_name:
        raise EngineeringError("product code and name are required")
    if db.scalar(select(Product.id).where(Product.code == normalized_code)) is not None:
        raise EngineeringError("product code already exists")
    row = Product(
        id=new_id("product"),
        code=normalized_code,
        name=normalized_name,
        product_type=product_type.strip().upper() or "BICYCLE",
        active=True,
    )
    db.add(row)
    db.flush()
    return row


def create_sku(
    db: Session,
    *,
    product_id: str,
    code: str,
    name: str,
    barcode: str | None = None,
) -> SKU:
    product = db.get(Product, product_id)
    if product is None or not product.active:
        raise EngineeringError("product not found or inactive")
    normalized_code = code.strip().upper()
    normalized_name = name.strip()
    normalized_barcode = (barcode or "").strip() or None
    if not normalized_code or not normalized_name:
        raise EngineeringError("SKU code and name are required")
    if db.scalar(select(SKU.id).where(SKU.code == normalized_code)) is not None:
        raise EngineeringError("SKU code already exists")
    if normalized_barcode and db.scalar(select(SKU.id).where(SKU.barcode == normalized_barcode)):
        raise EngineeringError("SKU barcode already exists")
    row = SKU(
        id=new_id("sku"),
        product_id=product.id,
        code=normalized_code,
        name=normalized_name,
        barcode=normalized_barcode,
        active=True,
    )
    db.add(row)
    db.flush()
    return row


def create_model(
    db: Session,
    *,
    product_id: str,
    platform_code: str,
    code: str,
    name: str,
    generation: int = 1,
    frame_material: str | None = None,
    wheel_size: str | None = None,
    motor_position: str | None = None,
    notes: str | None = None,
) -> BicycleModel:
    product = db.get(Product, product_id)
    if product is None or not product.active:
        raise EngineeringError("product not found or inactive")
    normalized_platform = platform_code.strip().upper()
    normalized_code = code.strip().upper()
    if normalized_platform not in FIXED_PLATFORM_CODES:
        raise EngineeringError("unsupported ALSVID platform")
    if not normalized_code.startswith(normalized_platform):
        raise EngineeringError("model code must start with its platform code")
    if generation < 1:
        raise EngineeringError("generation must be positive")
    platform = db.scalar(
        select(ProductPlatform).where(
            ProductPlatform.code == normalized_platform,
            ProductPlatform.active.is_(True),
        )
    )
    if platform is None:
        raise EngineeringError("ALSVID platform is unavailable")
    if db.scalar(select(BicycleModel.id).where(BicycleModel.product_id == product.id)) is not None:
        raise EngineeringError("product already has an ALSVID bicycle model")
    if db.scalar(select(BicycleModel.id).where(BicycleModel.code == normalized_code)) is not None:
        raise EngineeringError("ALSVID model code already exists")
    row = BicycleModel(
        id=new_id("model"),
        platform_id=platform.id,
        product_id=product.id,
        code=normalized_code,
        name=name.strip() or normalized_code,
        generation=generation,
        status="DRAFT",
        frame_material=(frame_material or "").strip() or None,
        wheel_size=(wheel_size or "").strip() or None,
        motor_position=(motor_position or "").strip() or None,
        notes=(notes or "").strip() or None,
    )
    db.add(row)
    db.flush()
    return row


def attach_variant(
    db: Session,
    *,
    model_id: str,
    sku_id: str,
    edition: str | None = None,
    color: str | None = None,
    market: str | None = None,
) -> BicycleVariant:
    model = db.get(BicycleModel, model_id)
    if model is None:
        raise EngineeringError("ALSVID model not found")
    if model.status == "RETIRED":
        raise EngineeringError("retired model cannot accept variants")
    sku = db.get(SKU, sku_id)
    if sku is None or not sku.active:
        raise EngineeringError("SKU not found or inactive")
    if sku.product_id != model.product_id:
        raise EngineeringError("variant SKU must belong to the model product")
    existing = db.scalar(select(BicycleVariant).where(BicycleVariant.sku_id == sku.id))
    if existing is not None:
        if existing.model_id != model.id:
            raise EngineeringError("SKU is already attached to another ALSVID model")
        existing.edition = (edition or "").strip() or None
        existing.color = (color or "").strip() or None
        existing.market = (market or "").strip().upper() or None
        existing.status = "ACTIVE"
        db.flush()
        return existing
    row = BicycleVariant(
        id=new_id("variant"),
        model_id=model.id,
        sku_id=sku.id,
        edition=(edition or "").strip() or None,
        color=(color or "").strip() or None,
        market=(market or "").strip().upper() or None,
        status="ACTIVE",
    )
    db.add(row)
    db.flush()
    return row


def create_part(
    db: Session,
    *,
    code: str,
    name: str,
    sku_id: str | None = None,
    category: str | None = None,
    manufacturer_part_no: str | None = None,
    description: str | None = None,
) -> Part:
    normalized_code = code.strip().upper()
    if not normalized_code or not name.strip():
        raise EngineeringError("part code and name are required")
    if db.scalar(select(Part.id).where(Part.code == normalized_code)) is not None:
        raise EngineeringError("part code already exists")
    if sku_id is not None:
        sku = db.get(SKU, sku_id)
        if sku is None or not sku.active:
            raise EngineeringError("part SKU not found or inactive")
        if db.scalar(select(Part.id).where(Part.sku_id == sku.id)) is not None:
            raise EngineeringError("SKU is already attached to another part")
    row = Part(
        id=new_id("part"),
        code=normalized_code,
        name=name.strip(),
        sku_id=sku_id,
        category=(category or "").strip() or None,
        manufacturer_part_no=(manufacturer_part_no or "").strip() or None,
        description=(description or "").strip() or None,
        active=True,
    )
    db.add(row)
    db.flush()
    return row


def upsert_bom_item(
    db: Session,
    *,
    model_id: str,
    part_id: str,
    position_code: str,
    quantity: int,
    callout: str | None = None,
) -> BomItem:
    model = db.get(BicycleModel, model_id)
    if model is None:
        raise EngineeringError("ALSVID model not found")
    if model.status == "RETIRED":
        raise EngineeringError("retired model BOM is immutable")
    part = db.get(Part, part_id)
    if part is None or not part.active:
        raise EngineeringError("part not found or inactive")
    position = position_code.strip().upper()
    if not position:
        raise EngineeringError("position code is required")
    if quantity < 1:
        raise EngineeringError("BOM quantity must be positive")
    row = db.scalar(
        select(BomItem).where(
            BomItem.model_id == model.id,
            BomItem.part_id == part.id,
            BomItem.position_code == position,
        )
    )
    if row is None:
        row = BomItem(
            model_id=model.id,
            part_id=part.id,
            position_code=position,
            quantity=quantity,
            callout=(callout or "").strip() or None,
        )
        db.add(row)
    else:
        row.quantity = quantity
        row.callout = (callout or "").strip() or None
    db.flush()
    return row


def _bom_snapshot(db: Session, model_id: str) -> list[dict]:
    rows = db.execute(
        select(BomItem, Part)
        .join(Part, Part.id == BomItem.part_id)
        .where(BomItem.model_id == model_id)
        .order_by(BomItem.position_code, Part.code)
    ).all()
    return [
        {
            "part_id": part.id,
            "part_code": part.code,
            "part_name": part.name,
            "position_code": item.position_code,
            "callout": item.callout or "",
            "quantity": item.quantity,
        }
        for item, part in rows
    ]


def release_bom(
    db: Session,
    *,
    model_id: str,
    actor_id: str | None = None,
    note: str = "",
) -> BomRevision:
    # Serialize revision-number allocation per model. The legacy implementation
    # read max revision without locking, allowing two concurrent releases to
    # allocate the same revision number before the unique constraint fired.
    model = db.scalar(select(BicycleModel).where(BicycleModel.id == model_id).with_for_update())
    if model is None:
        raise EngineeringError("ALSVID model not found")
    if model.status == "RETIRED":
        raise EngineeringError("retired model BOM is immutable")
    snapshot = _bom_snapshot(db, model.id)
    if not snapshot:
        raise EngineeringError("cannot release an empty BOM")
    canonical = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    checksum = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    latest = db.scalar(
        select(BomRevision)
        .where(BomRevision.model_id == model.id)
        .order_by(BomRevision.revision_no.desc())
        .limit(1)
    )
    if latest is not None and latest.checksum == checksum:
        return latest
    revision = BomRevision(
        id=new_id("bom_revision"),
        model_id=model.id,
        revision_no=(latest.revision_no if latest is not None else 0) + 1,
        status="RELEASED",
        checksum=checksum,
        snapshot=snapshot,
        note=note.strip(),
        released_by=actor_id,
    )
    db.add(revision)
    _audit(
        db,
        actor_id=actor_id,
        action="alsvid.bom.released",
        entity_type="bom_revision",
        entity_id=revision.id,
    )
    db.flush()
    return revision


def publish_model(
    db: Session,
    *,
    model_id: str,
    actor_id: str | None = None,
) -> BicycleModel:
    model = db.scalar(select(BicycleModel).where(BicycleModel.id == model_id).with_for_update())
    if model is None:
        raise EngineeringError("ALSVID model not found")
    if model.status == "RETIRED":
        raise EngineeringError("retired model cannot be republished")
    latest = db.scalar(
        select(BomRevision)
        .where(BomRevision.model_id == model.id, BomRevision.status == "RELEASED")
        .order_by(BomRevision.revision_no.desc())
        .limit(1)
    )
    if latest is None:
        raise EngineeringError("model requires a released BOM before publishing")
    model.status = "ACTIVE"
    if model.released_at is None:
        model.released_at = datetime.now(UTC)
    _audit(
        db,
        actor_id=actor_id,
        action="alsvid.model.published",
        entity_type="bicycle_model",
        entity_id=model.id,
    )
    db.flush()
    return model


def asset_owner_exists(db: Session, *, owner_type: str, owner_id: str) -> bool:
    owner_model = {
        "PLATFORM": ProductPlatform,
        "MODEL": BicycleModel,
        "BOM_REVISION": BomRevision,
        "PART": Part,
        "VEHICLE": Vehicle,
        "SERVICE_CASE": ServiceCase,
    }.get(owner_type.strip().upper())
    return owner_model is not None and db.get(owner_model, owner_id) is not None


def register_asset(
    db: Session,
    *,
    owner_type: str,
    owner_id: str,
    asset_type: str,
    storage_key: str,
    visibility: str = "INTERNAL",
    purpose: str = "",
    file_name: str = "",
    mime_type: str = "",
    size_bytes: int | None = None,
    sha256: str | None = None,
) -> Asset:
    normalized_owner = owner_type.strip().upper()
    normalized_type = asset_type.strip().upper()
    normalized_visibility = visibility.strip().upper()
    normalized_key = storage_key.strip()
    if normalized_type not in ASSET_TYPES:
        raise EngineeringError("unsupported ALSVID asset type")
    if normalized_visibility not in ASSET_VISIBILITIES:
        raise EngineeringError("unsupported ALSVID asset visibility")
    if not asset_owner_exists(db, owner_type=normalized_owner, owner_id=owner_id):
        raise EngineeringError("asset owner not found")
    expected_prefix = f"alsvid/{normalized_owner.lower()}/{owner_id}/"
    if not normalized_key.startswith(expected_prefix):
        raise EngineeringError("asset storage key does not match its ALSVID owner")
    if size_bytes is not None and size_bytes < 0:
        raise EngineeringError("asset size cannot be negative")
    digest = (sha256 or "").strip().lower() or None
    if digest is not None and (
        len(digest) != 64 or any(char not in "0123456789abcdef" for char in digest)
    ):
        raise EngineeringError("asset sha256 must contain 64 hex characters")
    existing = db.scalar(select(Asset).where(Asset.storage_key == normalized_key))
    if existing is not None:
        if existing.owner_type != normalized_owner or existing.owner_id != owner_id:
            raise EngineeringError("storage key already belongs to another asset owner")
        return existing
    row = Asset(
        id=new_id("asset"),
        owner_type=normalized_owner,
        owner_id=owner_id,
        asset_type=normalized_type,
        purpose=purpose.strip(),
        storage_key=normalized_key,
        file_name=file_name.strip(),
        mime_type=mime_type.strip(),
        size_bytes=size_bytes,
        sha256=digest,
        visibility=normalized_visibility,
    )
    db.add(row)
    db.flush()
    return row
