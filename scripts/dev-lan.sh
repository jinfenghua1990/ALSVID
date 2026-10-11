#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

docker compose -f infra/docker-compose.test.yml stop gateway web api worker >/dev/null 2>&1 || true
docker compose -f infra/docker-compose.dev.yml up -d

export DATABASE_URL="${DATABASE_URL:-postgresql://alsvid_test:alsvid_test@127.0.0.1:5433/alsvid_test}"
export OBJECT_STORAGE_PROVIDER="${OBJECT_STORAGE_PROVIDER:-unconfigured}"
export ALSVID_API_BASE_URL="${ALSVID_API_BASE_URL:-http://127.0.0.1:4000/api}"

exec pnpm dev
