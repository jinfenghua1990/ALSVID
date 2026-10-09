from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, enforce_csrf, permission_dependency
from alsvid.db import get_db
from alsvid.models.catalog import Product, SKU
from alsvid.models.engineering import (
    BicycleModel,
    BicycleVariant,
    BomItem,
    BomRevision,
    Part,
    ProductPlatform,
)
from alsvid.services.engineering import (
    EngineeringError,
    attach_variant,
    create_model,
    create_part,
    create_product,
    create_sku,
    publish_model,
    release_bom,
    upsert_bom_item,
)

router = APIRouter(prefix="/api/v1/product-center", tags=["product-center"])


class ProductCreate(BaseModel):
    code: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=200)
    product_type: str = Field(default="BICYCLE", max_length=40)


class SkuCreate(BaseModel):
    product_id: str
    code: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    barcode: str | None = Field(default=None, max_length=100)


class ModelCreate(BaseModel):
    product_id: str
    platform_code: str = Field(min_length=2, max_length=10)
    code: str = Field(min_length=2, max_length=20)
    name: str = Field(min_length=1, max_length=200)
    generation: int = Field(default=1, ge=1)
    frame_material: str | None = Field(default=None, max_length=120)
    wheel_size: str | None = Field(default=None, max_length=80)
    motor_position: str | None = Field(default=None, max_length=80)
    notes: str | None = None


class VariantAttach(BaseModel):
    sku_id: str
    edition: str | None = Field(default=None, max_length=80)
    color: str | None = Field(default=None, max_length=80)
    market: str | None = Field(default=None, max_length=20)


class PartCreate(BaseModel):
    code: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=200)
    sku_id: str | None = None
    category: str | None = Field(default=None, max_length=100)
    manufacturer_part_no: str | None = Field(default=None, max_length=120)
    description: str | None = None


class BomItemUpsert(BaseModel):
    part_id: str
    position_code: str = Field(min_length=1, max_length=40)
    quantity: int = Field(default=1, ge=1)
    callout: str | None = Field(default=None, max_length=80)


class BomRelease(BaseModel):
    note: str = ""


def _engineering_error(exc: EngineeringError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


def _latest_bom(db: Session, model_id: str) -> BomRevision | None:
    return db.scalar(
        select(BomRevision)
        .where(BomRevision.model_id == model_id, BomRevision.status == "RELEASED")
        .order_by(BomRevision.revision_no.desc())
        .limit(1)
    )


@router.get("/platforms")
def list_platforms(
    _principal: Principal = Depends(permission_dependency("alsvid.product.read")),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(ProductPlatform)
        .where(ProductPlatform.active.is_(True))
        .order_by(ProductPlatform.code)
    ).all()
    return [
        {
            "id": row.id,
            "code": row.code,
            "name": row.name,
            "meaning": row.meaning,
            "description": row.description,
        }
        for row in rows
    ]


@router.get("/models")
def list_models(
    _principal: Principal = Depends(permission_dependency("alsvid.product.read")),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(BicycleModel, ProductPlatform, Product)
        .join(ProductPlatform, ProductPlatform.id == BicycleModel.platform_id)
        .join(Product, Product.id == BicycleModel.product_id)
        .order_by(ProductPlatform.code, BicycleModel.code)
    ).all()
    result: list[dict] = []
    for model, platform, product in rows:
        latest = _latest_bom(db, model.id)
        result.append(
            {
                "id": model.id,
                "code": model.code,
                "name": model.name,
                "status": model.status,
                "generation": model.generation,
                "frame_material": model.frame_material,
                "wheel_size": model.wheel_size,
                "motor_position": model.motor_position,
                "released_at": model.released_at,
                "platform": {
                    "id": platform.id,
                    "code": platform.code,
                    "name": platform.name,
                    "meaning": platform.meaning,
                },
                "product": {"id": product.id, "code": product.code, "name": product.name},
                "latest_bom": (
                    {
                        "id": latest.id,
                        "revision_no": latest.revision_no,
                        "checksum": latest.checksum,
                        "released_at": latest.released_at,
                    }
                    if latest is not None
                    else None
                ),
            }
        )
    return result


@router.get("/models/{model_id}")
def model_detail(
    model_id: str,
    _principal: Principal = Depends(permission_dependency("alsvid.product.read")),
    db: Session = Depends(get_db),
):
    model = db.get(BicycleModel, model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="ALSVID model not found")
    platform = db.get(ProductPlatform, model.platform_id)
    product = db.get(Product, model.product_id)
    variants = db.execute(
        select(BicycleVariant, SKU)
        .join(SKU, SKU.id == BicycleVariant.sku_id)
        .where(BicycleVariant.model_id == model.id)
        .order_by(SKU.code)
    ).all()
    bom_rows = db.execute(
        select(BomItem, Part)
        .join(Part, Part.id == BomItem.part_id)
        .where(BomItem.model_id == model.id)
        .order_by(BomItem.position_code, Part.code)
    ).all()
    revisions = db.scalars(
        select(BomRevision)
        .where(BomRevision.model_id == model.id)
        .order_by(BomRevision.revision_no.desc())
    ).all()
    return {
        "id": model.id,
        "code": model.code,
        "name": model.name,
        "status": model.status,
        "generation": model.generation,
        "frame_material": model.frame_material,
        "wheel_size": model.wheel_size,
        "motor_position": model.motor_position,
        "notes": model.notes,
        "released_at": model.released_at,
        "platform": (
            {"id": platform.id, "code": platform.code, "name": platform.name}
            if platform is not None
            else None
        ),
        "product": (
            {"id": product.id, "code": product.code, "name": product.name}
            if product is not None
            else None
        ),
        "variants": [
            {
                "id": variant.id,
                "sku": {"id": sku.id, "code": sku.code, "name": sku.name},
                "edition": variant.edition,
                "color": variant.color,
                "market": variant.market,
                "status": variant.status,
            }
            for variant, sku in variants
        ],
        "bom": [
            {
                "part": {"id": part.id, "code": part.code, "name": part.name},
                "position_code": item.position_code,
                "callout": item.callout,
                "quantity": item.quantity,
            }
            for item, part in bom_rows
        ],
        "revisions": [
            {
                "id": row.id,
                "revision_no": row.revision_no,
                "status": row.status,
                "checksum": row.checksum,
                "note": row.note,
                "released_at": row.released_at,
            }
            for row in revisions
        ],
    }


@router.post("/products", status_code=201)
def add_product(
    payload: ProductCreate,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    try:
        row = create_product(db, **payload.model_dump())
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise _engineering_error(exc) from exc
    return {"id": row.id, "code": row.code, "name": row.name}


@router.post("/skus", status_code=201)
def add_sku(
    payload: SkuCreate,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    try:
        row = create_sku(db, **payload.model_dump())
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise _engineering_error(exc) from exc
    return {"id": row.id, "code": row.code, "name": row.name}


@router.post("/models", status_code=201)
def add_model(
    payload: ModelCreate,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    try:
        row = create_model(db, **payload.model_dump())
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise _engineering_error(exc) from exc
    return {"id": row.id, "code": row.code, "name": row.name, "status": row.status}


@router.post("/models/{model_id}/variants", status_code=201)
def add_variant(
    model_id: str,
    payload: VariantAttach,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    try:
        row = attach_variant(db, model_id=model_id, **payload.model_dump())
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise _engineering_error(exc) from exc
    return {"id": row.id, "model_id": row.model_id, "sku_id": row.sku_id}


@router.post("/parts", status_code=201)
def add_part(
    payload: PartCreate,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    try:
        row = create_part(db, **payload.model_dump())
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise _engineering_error(exc) from exc
    return {"id": row.id, "code": row.code, "name": row.name}


@router.put("/models/{model_id}/bom/items")
def put_bom_item(
    model_id: str,
    payload: BomItemUpsert,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    try:
        row = upsert_bom_item(db, model_id=model_id, **payload.model_dump())
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise _engineering_error(exc) from exc
    return {
        "id": row.id,
        "model_id": row.model_id,
        "part_id": row.part_id,
        "position_code": row.position_code,
        "quantity": row.quantity,
    }


@router.post("/models/{model_id}/bom/releases", status_code=201)
def release_model_bom(
    model_id: str,
    payload: BomRelease,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    try:
        row = release_bom(db, model_id=model_id, actor_id=principal.user.id, note=payload.note)
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise _engineering_error(exc) from exc
    return {
        "id": row.id,
        "revision_no": row.revision_no,
        "checksum": row.checksum,
        "released_at": row.released_at,
    }


@router.post("/models/{model_id}/publish")
def publish_product_model(
    model_id: str,
    request: Request,
    principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
):
    enforce_csrf(request, principal)
    try:
        row = publish_model(db, model_id=model_id, actor_id=principal.user.id)
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise _engineering_error(exc) from exc
    return {"id": row.id, "code": row.code, "status": row.status, "released_at": row.released_at}
