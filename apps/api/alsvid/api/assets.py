import re
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, permission_dependency
from alsvid.config import Settings, get_settings
from alsvid.db import get_db
from alsvid.models.assets import Asset
from alsvid.services.engineering import (
    ASSET_TYPES,
    ASSET_VISIBILITIES,
    EngineeringError,
    asset_owner_exists,
    register_asset,
)
from alsvid.services.object_storage import (
    AssetObjectNotFound,
    AssetStorageError,
    AssetStorageNotConfigured,
    R2ObjectStorage,
)

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])
_SAFE_FILE_RE = re.compile(r"[^A-Za-z0-9._-]+")


class AssetUploadTicket(BaseModel):
    owner_type: str = Field(min_length=1, max_length=30)
    owner_id: str = Field(min_length=1, max_length=40)
    asset_type: str = Field(min_length=1, max_length=30)
    visibility: str = Field(default="INTERNAL", max_length=20)
    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(default="application/octet-stream", max_length=120)
    sha256: str | None = Field(default=None, max_length=64)


class AssetFinalize(BaseModel):
    owner_type: str = Field(min_length=1, max_length=30)
    owner_id: str = Field(min_length=1, max_length=40)
    asset_type: str = Field(min_length=1, max_length=30)
    visibility: str = Field(default="INTERNAL", max_length=20)
    purpose: str = Field(default="", max_length=100)
    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(default="application/octet-stream", max_length=120)
    storage_key: str = Field(min_length=1, max_length=500)
    size_bytes: int | None = Field(default=None, ge=0)
    sha256: str | None = Field(default=None, max_length=64)


def get_asset_storage(settings: Settings = Depends(get_settings)) -> R2ObjectStorage:
    return R2ObjectStorage.from_settings(settings)


def _safe_file_name(file_name: str) -> str:
    raw = Path(file_name).name.strip()
    if not raw:
        raise HTTPException(status_code=422, detail="Asset file name is required")
    safe = _SAFE_FILE_RE.sub("_", raw).strip("._") or "asset"
    return safe[:160]


def _normalize_descriptor(asset_type: str, visibility: str) -> tuple[str, str]:
    normalized_type = asset_type.strip().upper()
    normalized_visibility = visibility.strip().upper()
    if normalized_type not in ASSET_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported ALSVID asset type")
    if normalized_visibility not in ASSET_VISIBILITIES:
        raise HTTPException(status_code=422, detail="Unsupported ALSVID asset visibility")
    return normalized_type, normalized_visibility


def _normalize_sha256(value: str | None) -> str | None:
    digest = (value or "").strip().lower()
    if not digest:
        return None
    if len(digest) != 64 or any(char not in "0123456789abcdef" for char in digest):
        raise HTTPException(status_code=422, detail="Asset sha256 must contain 64 hex characters")
    return digest


def _require_owner(db: Session, *, owner_type: str, owner_id: str) -> str:
    normalized = owner_type.strip().upper()
    if not asset_owner_exists(db, owner_type=normalized, owner_id=owner_id):
        raise HTTPException(status_code=404, detail="ALSVID asset owner not found")
    return normalized


def _storage_key(owner_type: str, owner_id: str, file_name: str) -> str:
    return (
        f"alsvid/{owner_type.lower()}/{owner_id}/"
        f"{secrets.token_hex(10)}-{_safe_file_name(file_name)}"
    )


def _storage_http_error(exc: AssetStorageError) -> HTTPException:
    if isinstance(exc, AssetStorageNotConfigured):
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, AssetObjectNotFound):
        return HTTPException(status_code=404, detail=str(exc))
    return HTTPException(status_code=502, detail=str(exc))


@router.post("/upload-ticket")
def create_upload_ticket(
    payload: AssetUploadTicket,
    _principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
    storage: R2ObjectStorage = Depends(get_asset_storage),
):
    owner_type = _require_owner(db, owner_type=payload.owner_type, owner_id=payload.owner_id)
    asset_type, visibility = _normalize_descriptor(payload.asset_type, payload.visibility)
    digest = _normalize_sha256(payload.sha256)
    key = _storage_key(owner_type, payload.owner_id, payload.file_name)
    try:
        upload = storage.presign_upload(
            key=key,
            content_type=payload.mime_type or "application/octet-stream",
            sha256=digest,
        )
    except AssetStorageError as exc:
        raise _storage_http_error(exc) from exc
    return {
        "owner_type": owner_type,
        "owner_id": payload.owner_id,
        "asset_type": asset_type,
        "visibility": visibility,
        "storage_key": key,
        "upload_url": upload.url,
        "method": "PUT",
        "headers": upload.headers,
        "expires_in": upload.expires_in,
    }


@router.post("/finalize", status_code=status.HTTP_201_CREATED)
def finalize_uploaded_asset(
    payload: AssetFinalize,
    _principal: Principal = Depends(permission_dependency("alsvid.product.write")),
    db: Session = Depends(get_db),
    storage: R2ObjectStorage = Depends(get_asset_storage),
):
    owner_type = _require_owner(db, owner_type=payload.owner_type, owner_id=payload.owner_id)
    asset_type, visibility = _normalize_descriptor(payload.asset_type, payload.visibility)
    expected_prefix = f"alsvid/{owner_type.lower()}/{payload.owner_id}/"
    if not payload.storage_key.startswith(expected_prefix):
        raise HTTPException(status_code=422, detail="Asset storage key does not match its owner")
    digest = _normalize_sha256(payload.sha256)
    try:
        stored = storage.head(payload.storage_key)
    except AssetStorageError as exc:
        raise _storage_http_error(exc) from exc
    if payload.size_bytes is not None and stored.size_bytes != payload.size_bytes:
        raise HTTPException(status_code=409, detail="Uploaded asset size does not match the ticket")
    if digest is not None and stored.sha256 != digest:
        raise HTTPException(status_code=409, detail="Uploaded asset sha256 metadata does not match")
    try:
        row = register_asset(
            db,
            owner_type=owner_type,
            owner_id=payload.owner_id,
            asset_type=asset_type,
            storage_key=payload.storage_key,
            visibility=visibility,
            purpose=payload.purpose,
            file_name=_safe_file_name(payload.file_name),
            mime_type=stored.content_type or payload.mime_type,
            size_bytes=stored.size_bytes,
            sha256=stored.sha256 or digest,
        )
        db.commit()
    except EngineeringError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "id": row.id,
        "owner_type": row.owner_type,
        "owner_id": row.owner_id,
        "asset_type": row.asset_type,
        "storage_key": row.storage_key,
        "visibility": row.visibility,
        "purpose": row.purpose,
        "file_name": row.file_name,
        "mime_type": row.mime_type,
        "size_bytes": row.size_bytes,
        "sha256": row.sha256,
    }


@router.get("/{asset_id}/access")
def get_asset_access(
    asset_id: str,
    _principal: Principal = Depends(permission_dependency("alsvid.product.read")),
    db: Session = Depends(get_db),
    storage: R2ObjectStorage = Depends(get_asset_storage),
):
    row = db.get(Asset, asset_id)
    if row is None:
        raise HTTPException(status_code=404, detail="ALSVID asset not found")
    _require_owner(db, owner_type=row.owner_type, owner_id=row.owner_id)
    try:
        result = storage.access_url(key=row.storage_key, visibility=row.visibility)
    except AssetStorageError as exc:
        raise _storage_http_error(exc) from exc
    return {
        "asset_id": row.id,
        "url": result.url,
        "mode": result.mode,
        "expires_in": result.expires_in,
    }


@router.get("")
def list_assets(
    owner_type: str | None = None,
    owner_id: str | None = None,
    _principal: Principal = Depends(permission_dependency("alsvid.product.read")),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select

    statement = select(Asset)
    if owner_type:
        statement = statement.where(Asset.owner_type == owner_type.strip().upper())
    if owner_id:
        statement = statement.where(Asset.owner_id == owner_id)
    rows = db.scalars(statement.order_by(Asset.created_at.desc(), Asset.id)).all()
    return [
        {
            "id": row.id,
            "owner_type": row.owner_type,
            "owner_id": row.owner_id,
            "asset_type": row.asset_type,
            "purpose": row.purpose,
            "file_name": row.file_name,
            "mime_type": row.mime_type,
            "size_bytes": row.size_bytes,
            "sha256": row.sha256,
            "visibility": row.visibility,
            "created_at": row.created_at,
        }
        for row in rows
    ]
