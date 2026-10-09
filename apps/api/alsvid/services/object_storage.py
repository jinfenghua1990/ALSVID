from dataclasses import dataclass
from urllib.parse import quote

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from alsvid.config import Settings


class AssetStorageError(RuntimeError):
    pass


class AssetStorageNotConfigured(AssetStorageError):
    pass


class AssetObjectNotFound(AssetStorageError):
    pass


@dataclass(frozen=True)
class PresignedUpload:
    url: str
    headers: dict[str, str]
    expires_in: int


@dataclass(frozen=True)
class StoredObject:
    size_bytes: int
    content_type: str
    sha256: str | None = None


@dataclass(frozen=True)
class ObjectAccess:
    url: str
    mode: str
    expires_in: int | None


def _text(value: str | None) -> str:
    return (value or "").strip()


class R2ObjectStorage:
    def __init__(
        self,
        *,
        endpoint_url: str | None,
        bucket: str | None,
        access_key_id: str | None,
        secret_access_key: str | None,
        region: str | None = "auto",
        public_base_url: str | None = "",
        presign_seconds: int = 900,
    ) -> None:
        self.endpoint_url = _text(endpoint_url)
        self.bucket = _text(bucket)
        self.access_key_id = _text(access_key_id)
        self.secret_access_key = _text(secret_access_key)
        self.region = _text(region) or "auto"
        self.public_base_url = _text(public_base_url).rstrip("/")
        self.presign_seconds = max(60, min(int(presign_seconds), 3600))

    @classmethod
    def from_settings(cls, settings: Settings) -> "R2ObjectStorage":
        return cls(
            endpoint_url=settings.r2_endpoint_url,
            bucket=settings.r2_bucket,
            access_key_id=settings.r2_access_key_id,
            secret_access_key=settings.r2_secret_access_key,
            region=settings.r2_region,
            public_base_url=settings.r2_public_base_url,
            presign_seconds=settings.r2_presign_seconds,
        )

    @property
    def configured(self) -> bool:
        return all(
            (
                self.endpoint_url,
                self.bucket,
                self.access_key_id,
                self.secret_access_key,
            )
        )

    def _client(self):
        if not self.configured:
            raise AssetStorageNotConfigured("ALSVID R2 asset storage is not configured")
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name=self.region,
            config=Config(signature_version="s3v4"),
        )

    def presign_upload(
        self,
        *,
        key: str,
        content_type: str,
        sha256: str | None = None,
    ) -> PresignedUpload:
        normalized_key = key.strip()
        if not normalized_key:
            raise AssetStorageError("asset storage key is required")
        normalized_type = content_type.strip() or "application/octet-stream"
        params: dict[str, object] = {
            "Bucket": self.bucket,
            "Key": normalized_key,
            "ContentType": normalized_type,
        }
        headers = {"Content-Type": normalized_type}
        if sha256:
            params["Metadata"] = {"sha256": sha256}
            headers["x-amz-meta-sha256"] = sha256
        try:
            url = self._client().generate_presigned_url(
                "put_object",
                Params=params,
                ExpiresIn=self.presign_seconds,
            )
        except (BotoCoreError, ClientError) as exc:
            raise AssetStorageError("failed to create R2 upload URL") from exc
        return PresignedUpload(url=url, headers=headers, expires_in=self.presign_seconds)

    def head(self, key: str) -> StoredObject:
        try:
            response = self._client().head_object(Bucket=self.bucket, Key=key)
        except ClientError as exc:
            code = str(exc.response.get("Error", {}).get("Code") or "")
            if code in {"404", "NoSuchKey", "NotFound"}:
                raise AssetObjectNotFound("uploaded R2 object was not found") from exc
            raise AssetStorageError("failed to verify R2 object") from exc
        except BotoCoreError as exc:
            raise AssetStorageError("failed to verify R2 object") from exc
        metadata = response.get("Metadata") or {}
        digest = str(metadata.get("sha256") or "").strip().lower() or None
        return StoredObject(
            size_bytes=int(response.get("ContentLength") or 0),
            content_type=str(response.get("ContentType") or ""),
            sha256=digest,
        )

    def access_url(self, *, key: str, visibility: str) -> ObjectAccess:
        normalized_key = key.strip()
        if not normalized_key:
            raise AssetStorageError("asset storage key is required")
        if visibility.strip().upper() == "PUBLIC" and self.public_base_url:
            return ObjectAccess(
                url=f"{self.public_base_url}/{quote(normalized_key, safe='/')}",
                mode="public",
                expires_in=None,
            )
        try:
            url = self._client().generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": normalized_key},
                ExpiresIn=self.presign_seconds,
            )
        except (BotoCoreError, ClientError) as exc:
            raise AssetStorageError("failed to create R2 access URL") from exc
        return ObjectAccess(url=url, mode="signed", expires_in=self.presign_seconds)
