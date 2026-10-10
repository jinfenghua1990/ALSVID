#!/usr/bin/env bash
set -euo pipefail

compose=(docker compose -f infra/docker-compose.test.yml)

echo "== Docker versions =="
docker --version
docker compose version

echo "== Build ALSVID Test images =="
"${compose[@]}" build

echo "== Start PostgreSQL =="
"${compose[@]}" up -d postgres

echo "== Apply migrations =="
"${compose[@]}" run --rm api pnpm db:migrate

echo "== Start Web, API and Worker =="
"${compose[@]}" up -d web api worker

wait_for_url() {
  local name="$1"
  local url="$2"
  for attempt in {1..30}; do
    if curl --fail --silent "$url" >/dev/null; then
      echo "$name ready: $url"
      return 0
    fi
    sleep 2
  done
  echo "$name did not become ready: $url" >&2
  "${compose[@]}" logs --no-color
  return 1
}

wait_for_url "API" "http://127.0.0.1:4001/api/health"
wait_for_url "Web" "http://127.0.0.1:3001/"

echo "== Container state =="
"${compose[@]}" ps

echo
echo "ALSVID core Test acceptance passed."
echo "Web: http://127.0.0.1:3001/"
echo "API health: http://127.0.0.1:4001/api/health"
echo "Object-storage provider acceptance is tracked separately in Issue #35."
echo
echo "To stop Test: docker compose -f infra/docker-compose.test.yml down"
