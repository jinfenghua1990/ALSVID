#!/usr/bin/env bash
set -euo pipefail

archive="${1:-}"
if [[ -z "$archive" || ! -f "$archive" ]]; then
  echo "Usage: RESTORE_DATABASE_URL=... ALSVID_ALLOW_RESTORE=yes $0 <backup.dump>" >&2
  exit 1
fi

if [[ -z "${RESTORE_DATABASE_URL:-}" ]]; then
  echo "RESTORE_DATABASE_URL is required" >&2
  exit 1
fi

if [[ "${ALSVID_ALLOW_RESTORE:-}" != "yes" ]]; then
  echo "Refusing destructive restore. Set ALSVID_ALLOW_RESTORE=yes for an isolated restore target." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required (PostgreSQL 18 client recommended)" >&2
  exit 1
fi

checksum_file="${archive}.sha256"
if [[ -f "$checksum_file" ]]; then
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum --check "$checksum_file"
  elif command -v shasum >/dev/null 2>&1; then
    expected="$(awk '{print $1}' "$checksum_file")"
    actual="$(shasum -a 256 "$archive" | awk '{print $1}')"
    [[ "$expected" == "$actual" ]] || { echo "Checksum verification failed" >&2; exit 1; }
  else
    echo "No SHA-256 utility available; cannot verify backup" >&2
    exit 1
  fi
fi

pg_restore \
  --dbname="$RESTORE_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$archive"

echo "Restore completed. Run migrations and acceptance checks before considering the drill successful."
