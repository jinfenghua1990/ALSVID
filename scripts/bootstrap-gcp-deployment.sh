#!/usr/bin/env bash
#
# scripts/bootstrap-gcp-deployment.sh
#
# Idempotent bootstrap of the GCP + GitHub prerequisites that the ALSVID
# production deployment (github.com/jinfenghua1990/ALSVID,
# .github/workflows/production-deploy.yml) requires.
#
# This provisions ONLY the "self-boot" layer so a fresh robot / new GCP
# project can clone and deploy. It does NOT create Cloud Run services or
# the worker pool — those are created by the workflow itself.
#
# SAFE BY DEFAULT: dry-run. Pass --apply to actually create resources.
# Secrets (DB url, R2 keys, mail key) are NEVER generated; they must be
# supplied via flags / env. The script refuses to run --apply without them.
#
set -euo pipefail

PROJECT_ID=""
REGION="europe-west1"
GAR_REPO="alsvid-images"
REPO="jinfenghua1990/ALSVID"
ENV_NAME="production"
APPLY=false

DEPLOY_SA="gcp-alsvid-deploy"
RUNTIME_SA="gcp-alsvid-runtime"
WIF_POOL="alsvid-github-pool"
WIF_PROVIDER="alsvid-github-provider"

# Operator-supplied secrets (NEVER generated, required for --apply).
SECRET_DB="${ALSVID_DB_URL:-}"
SECRET_R2_KEY="${ALSVID_R2_ACCESS_KEY:-}"
SECRET_R2_SECRET="${ALSVID_R2_SECRET_KEY:-}"
SECRET_MAIL="${ALSVID_MAIL_API_KEY:-}"
R2_ENDPOINT="${ALSVID_R2_ENDPOINT:-}"
R2_BUCKET="${ALSVID_R2_BUCKET:-}"
MAIL_FROM="${ALSVID_MAIL_FROM_ADDRESS:-noreply@alsvidbike.com}"
FC1_RESERVE="${ALSVID_FC1_RESERVE_EMAIL:-info@alsvidbike.com}"

die() { echo "ERROR: $*" >&2; exit 1; }
req() { command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"; }

usage() {
  cat <<'EOF'
Usage: scripts/bootstrap-gcp-deployment.sh --project-id ID [options]

  --project-id ID        GCP project id (required)
  --region REGION        GCP region (default europe-west1)
  --gar-repo NAME        Artifact Registry repo name (default alsvid-images)
  --repo OWNER/NAME      GitHub repo (default jinfenghua1990/ALSVID)
  --apply                 Actually create resources. Dry-run is the default.
  --yes                   Skip the "about to create" confirmation under --apply
  -h                      Show this help

Secrets must be provided via environment variables (refuse --apply without them):
  ALSVID_DB_URL, ALSVID_R2_ACCESS_KEY, ALSVID_R2_SECRET_KEY, ALSVID_MAIL_API_KEY
  ALSVID_R2_ENDPOINT, ALSVID_R2_BUCKET
  (MAIL_FROM_ADDRESS, FC1_RESERVE_EMAIL have defaults)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-id) PROJECT_ID="${2:-}"; shift 2 ;;
    --region) REGION="${2:-}"; shift 2 ;;
    --gar-repo) GAR_REPO="${2:-}"; shift 2 ;;
    --repo) REPO="${2:-}"; shift 2 ;;
    --apply) APPLY=true; shift ;;
    --yes) YES=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown arg: $1 (use -h)" ;;
  esac
done

[[ -n "$PROJECT_ID" ]] || die "--project-id is required"
req gcloud
req gh
gcloud config get-value project >/dev/null 2>&1 || die "gcloud not authenticated"
gh auth status >/dev/null 2>&1 || die "gh not authenticated"

# GCP identity used by the workflow = the WIF provider full name.
WIF_PROVIDER_FULL="projects/${PROJECT_ID}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}"
DEPLOY_SA_FULL="${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA_FULL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
WIF_PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_ID}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${REPO}"

run() {
  # Print every planned command; only execute when APPLY.
  if $APPLY; then
    echo "  > $*"
    eval "$@"
  else
    echo "  (dry-run) $*"
  fi
}

echo "=== ALSVID deployment bootstrap ==="
echo "Project: $PROJECT_ID   Region: $REGION   Repo: $REPO   Env: $ENV_NAME"
echo "Mode: $( $APPLY && echo APPLY || echo DRY-RUN )"
echo

if $APPLY; then
  missing=0
  for v in ALSVID_DB_URL ALSVID_R2_ACCESS_KEY ALSVID_R2_SECRET_KEY ALSVID_MAIL_API_KEY ALSVID_R2_ENDPOINT ALSVID_R2_BUCKET; do
    [[ -n "${!v}" ]] || { echo "  missing required secret/env: $v" >&2; missing=1; }
  done
  [[ $missing -eq 0 ]] || die "aborting --apply (secrets must be supplied)"
  if [[ "${YES:-false}" != "true" ]]; then
    read -r -p "About to create GCP + GitHub resources in $PROJECT_ID. Continue? [y/N] " ans
    [[ "$ans" == "y" || "$ans" == "Y" ]] || die "aborted by user"
  fi
fi

step() { echo "== $* =="; }

step "Enable required APIs"
run "gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com cloudbuild.googleapis.com serviceusage.googleapis.com --project=$PROJECT_ID --quiet"

step "Create Artifact Registry repository"
if ! gcloud artifacts repositories describe "$GAR_REPO" --project="$PROJECT_ID" --location="$REGION" >/dev/null 2>&1; then
  run "gcloud artifacts repositories create $GAR_REPO --project=$PROJECT_ID --location=$REGION --repository-format=docker --description=ALSVID images --quiet"
else
  echo "  (exists) $GAR_REPO"
fi

step "Create service accounts"
for sa in "$DEPLOY_SA" "$RUNTIME_SA"; do
  if ! gcloud iam service-accounts describe "${sa}@${PROJECT_ID}.iam.gserviceaccount.com" --project="$PROJECT_ID" >/dev/null 2>&1; then
    run "gcloud iam service-accounts create $sa --project=$PROJECT_ID --display-name=ALSVID-$sa --quiet"
  else
    echo "  (exists) $sa"
  fi
done

step "Create Workload Identity Federation (GitHub OIDC)"
if ! gcloud iam workload-identity-pools describe "$WIF_POOL" --project="$PROJECT_ID" --location=global >/dev/null 2>&1; then
  run "gcloud iam workload-identity-pools create $WIF_POOL --project=$PROJECT_ID --location=global --display-name=ALSVID GitHub --quiet"
else
  echo "  (exists) pool $WIF_POOL"
fi
if ! gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" --project="$PROJECT_ID" --location=global --workload-identity-pool="$WIF_POOL" >/dev/null 2>&1; then
  run "gcloud iam workload-identity-pools providers create-oidc $WIF_PROVIDER --project=$PROJECT_ID --location=global --workload-identity-pool=$WIF_POOL --display-name='ALSVID GitHub Actions' --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository' --attribute-condition=\"assertion.repository=='$REPO'\" --issuer-uri=https://token.actions.githubusercontent.com --quiet"
else
  echo "  (exists) provider $WIF_PROVIDER"
fi

step "Grant WIF provider permission to impersonate both service accounts"
for sa in "$DEPLOY_SA_FULL" "$RUNTIME_SA_FULL"; do
  run "gcloud iam service-accounts add-iam-policy-binding $sa --project=$PROJECT_ID --role=roles/iam.workloadIdentityUser --member='$WIF_PRINCIPAL' --quiet"
done

step "Create Secret Manager secrets (values from operator, never generated)"
declare -A SECRETS=(
  [alsvid-database-url]="$SECRET_DB"
  [alsvid-r2-access-key]="$SECRET_R2_KEY"
  [alsvid-r2-secret-key]="$SECRET_R2_SECRET"
  [alsvidbike-mail-api-key]="$SECRET_MAIL"
)
for name in "${!SECRETS[@]}"; do
  val="${SECRETS[$name]}"
  [[ -n "$val" ]] || { echo "  skip $name (empty)" >&2; continue; }
  tmp=$(mktemp); printf '%s' "$val" > "$tmp"
  if ! gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    run "gcloud secrets create $name --project=$PROJECT_ID --data-file=$tmp --quiet"
  else
    echo "  (exists) $name -> add new version"
    run "gcloud secrets add-version $name --project=$PROJECT_ID --data-file=$tmp --quiet"
  fi
  rm -f "$tmp"
done

step "Set GitHub Actions environment variables (env: $ENV_NAME)"
declare -A VARS=(
  [GCP_PROJECT_ID]="$PROJECT_ID"
  [GCP_REGION]="$REGION"
  [GAR_REPOSITORY]="$GAR_REPO"
  [GCP_WORKLOAD_IDENTITY_PROVIDER]="$WIF_PROVIDER_FULL"
  [GCP_DEPLOY_SERVICE_ACCOUNT]="$DEPLOY_SA_FULL"
  [GCP_RUNTIME_SERVICE_ACCOUNT]="$RUNTIME_SA_FULL"
  [R2_ENDPOINT]="$R2_ENDPOINT"
  [R2_BUCKET]="$R2_BUCKET"
  [MAIL_PROVIDER]="resend"
  [MAIL_FROM_ADDRESS]="$MAIL_FROM"
  [NEXT_PUBLIC_FC1_RESERVATION_EMAIL]="$FC1_RESERVE"
)
for name in "${!VARS[@]}"; do
  echo "  set $name"
  run "gh variable set $name --body='${VARS[$name]}' --repo=$REPO --env=$ENV_NAME"
done

echo
echo "=== Done ($( $APPLY && echo applied || echo dry-run )) ==="
echo "Next: add the production environment secret RESEND_DOMAIN_AUDIT_API_KEY via"
echo "      GitHub UI (Settings > Environments > production > secrets)."
echo "Then any runner/bot can trigger .github/workflows/production-deploy.yml with"
echo "      confirm=deploy to build and deploy ALSVID (web + api + worker pool)."
