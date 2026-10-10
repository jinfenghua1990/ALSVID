#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required (PostgreSQL 18 client recommended)" >&2
  exit 1
fi

backup_dir="${ALSVID_BACKUP_DIR:-backups/postgres}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
release="${ALSVID_RELEASE_SHA:-unknown}"
mkdir -p "$backup_dir"

output="$backup_dir/alsvid-${timestamp}-${release}.dump"
pg_dump \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$output"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$output" > "${output}.sha256"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$output" > "${output}.sha256"
else
  echo "No SHA-256 utility available; backup created without checksum" >&2
fi

printf '%s\n' "$output"
