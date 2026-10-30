#!/usr/bin/env bash
#
# scripts/verify-alsvid-deployment.sh
#
# READ-ONLY post-deploy verification for ALSVID production.
# Run AFTER .github/workflows/production-deploy.yml finishes (confirm=deploy).
#
# This script never mutates anything: it only calls gcloud describe/list
# and curl against /api/health.
#
# Production intentionally deploys Web, API and the one-off migration job only.
# The Worker scaffold remains available for local/CI use; no production Worker Pool
# is required until real business handlers and queued workloads are introduced.
#
# Checks:
#   1. Cloud Run service alsvid-api exists and /api/health responds
#   2. Cloud Run service alsvid-web exists
#   3. Warn about unmanaged per-product Cloud Run services
#   4. Migration job alsvid-migrate exists; show latest executions
#   5. Release SHA match (optional, --release-sha)
#
# Exit code: 0 when no FAIL, 1 otherwise.
#
set -uo pipefail

PROJECT_ID=""
REGION="europe-west1"
RELEASE_SHA=""
API_SERVICE="alsvid-api"
WEB_SERVICE="alsvid-web"
MIGRATION_JOB="alsvid-migrate"

FAIL=0
WARN=0
pass() { echo "[PASS] $*"; }
fail() { echo "[FAIL] $*"; FAIL=$((FAIL + 1)); }
warn() { echo "[WARN] $*"; WARN=$((WARN + 1)); }

usage() {
  cat <<EOF
Usage: scripts/verify-alsvid-deployment.sh --project-id ID [--region REGION] [--release-sha SHA]

  --project-id ID     GCP project id (required)
  --region REGION     GCP region (default ${REGION})
  --release-sha SHA   optional: assert the deployed ALSVID_RELEASE_SHA matches
  -h, --help          show this help

Read-only. Requires gcloud (authenticated) and curl.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-id) PROJECT_ID="${2:-}"; shift 2 ;;
    --region) REGION="${2:-}"; shift 2 ;;
    --release-sha) RELEASE_SHA="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

[[ -n "$PROJECT_ID" ]] || { echo "ERROR: --project-id is required" >&2; usage; exit 2; }
command -v gcloud >/dev/null 2>&1 || { echo "ERROR: gcloud not found" >&2; exit 2; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not found" >&2; exit 2; }

echo "=== ALSVID deployment verification ==="
echo "Project: $PROJECT_ID   Region: $REGION"
echo

# --- 1. API service ---
echo "== API service =="
API_URL="$(gcloud run services describe "$API_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)' 2>/dev/null || true)"
if [[ -n "$API_URL" ]]; then
  pass "$API_SERVICE exists -> $API_URL"
  if curl -fsS --retry 3 --retry-delay 5 --max-time 20 "$API_URL/api/health" >/dev/null 2>&1; then
    pass "$API_SERVICE /api/health responds"
  else
    fail "$API_SERVICE /api/health did not respond"
  fi
else
  fail "$API_SERVICE not found in $REGION"
fi

# --- 2. Web service ---
echo "== Web service =="
if gcloud run services describe "$WEB_SERVICE" --project="$PROJECT_ID" --region="$REGION" >/dev/null 2>&1; then
  pass "$WEB_SERVICE exists"
else
  fail "$WEB_SERVICE not found in $REGION"
fi

# --- 3. Unmanaged per-product services ---
echo "== Product-specific Cloud Run services =="
if SERVICE_LIST="$(gcloud run services list --project="$PROJECT_ID" --region="$REGION" --format='value(metadata.name)' 2>/dev/null)"; then
  for LEGACY_SERVICE in alsvid-fc1 alsvid-pilot-x5; do
    if grep -Fxq "$LEGACY_SERVICE" <<< "$SERVICE_LIST"; then
      warn "$LEGACY_SERVICE exists but is not managed by the current deployment workflows; check domain mappings, traffic tags and external integrations before deleting"
    else
      pass "$LEGACY_SERVICE is absent"
    fi
  done
else
  warn "could not list Cloud Run services; skipped product-specific service check"
fi

# --- 4. Migration job ---
echo "== Migration job =="
if gcloud run jobs describe "$MIGRATION_JOB" --project="$PROJECT_ID" --region="$REGION" >/dev/null 2>&1; then
  pass "$MIGRATION_JOB exists"
  echo "  (latest executions)"
  gcloud run jobs executions list --job="$MIGRATION_JOB" --project="$PROJECT_ID" --region="$REGION" --limit=3 \
      --format='table(metadata.name,status.completionTime)' 2>/dev/null | sed 's/^/  /' \
    || warn "could not list job executions"
else
  warn "$MIGRATION_JOB not found (may have been cleaned up)"
fi

# --- 5. Release SHA (optional) ---
if [[ -n "$RELEASE_SHA" ]]; then
  echo "== Release SHA =="
  DEPLOYED_SHA="$(gcloud run services describe "$API_SERVICE" --project="$PROJECT_ID" --region="$REGION" \
    --format='value(spec.template.spec.containers[0].env)' 2>/dev/null \
    | tr ',' '\n' | sed -n 's/^ALSVID_RELEASE_SHA=//p' | head -1)"
  if [[ "$DEPLOYED_SHA" == "$RELEASE_SHA" ]]; then
    pass "API release SHA matches $RELEASE_SHA"
  elif [[ -z "$DEPLOYED_SHA" ]]; then
    warn "could not read ALSVID_RELEASE_SHA from $API_SERVICE"
  else
    fail "API release SHA is $DEPLOYED_SHA, expected $RELEASE_SHA"
  fi
fi

echo
echo "=== Summary: ${FAIL} FAIL, ${WARN} WARN ==="
if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
