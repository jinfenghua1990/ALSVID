#!/usr/bin/env bash
set -euo pipefail

compose=(docker compose)
if [[ -f infra/.env.test.local ]]; then
  compose+=(--env-file infra/.env.test.local)
fi
compose+=(-f infra/docker-compose.test.yml)

echo "== Docker versions =="
docker --version
docker compose version

echo "== Build ALSVID Development/Test images =="
"${compose[@]}" build

echo "== Start PostgreSQL =="
"${compose[@]}" up -d postgres

echo "== Apply migrations =="
"${compose[@]}" run --rm api pnpm db:migrate

echo "== Start Gateway, Web, API and Worker =="
"${compose[@]}" up -d gateway web api worker

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

wait_for_url "Gateway API" "http://127.0.0.1:8080/api/health"
wait_for_url "Gateway Web" "http://127.0.0.1:8080/"

echo "== Container state =="
"${compose[@]}" ps

echo
echo "ALSVID Development/Test acceptance passed."
echo "Gateway: http://127.0.0.1:8080/"
echo "Gateway API health: http://127.0.0.1:8080/api/health"
echo
echo "To stop Test: docker compose -f infra/docker-compose.test.yml down"
