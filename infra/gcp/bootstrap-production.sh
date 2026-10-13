#!/usr/bin/env bash
set -euo pipefail

# Idempotent Google Cloud bootstrap for ALSVID production infrastructure.
# Run this as a Google Cloud principal allowed to enable APIs and manage IAM.
# It creates resource shells only; it never accepts or writes production secret values.
# A dedicated Google Cloud project for ALSVID is strongly recommended.

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_command gcloud
require_env GCP_PROJECT_ID
require_env GCP_REGION

GAR_REPOSITORY="${GAR_REPOSITORY:-alsvid}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-jinfenghua1990/ALSVID}"
WIF_POOL_ID="${WIF_POOL_ID:-github}"
WIF_PROVIDER_ID="${WIF_PROVIDER_ID:-alsvid-next}"
DEPLOY_SERVICE_ACCOUNT_ID="${DEPLOY_SERVICE_ACCOUNT_ID:-alsvid-github-deploy}"
RUNTIME_SERVICE_ACCOUNT_ID="${RUNTIME_SERVICE_ACCOUNT_ID:-alsvid-runtime}"

DEPLOY_SERVICE_ACCOUNT="${DEPLOY_SERVICE_ACCOUNT_ID}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SERVICE_ACCOUNT="${RUNTIME_SERVICE_ACCOUNT_ID}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

active_account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
if [[ -z "$active_account" ]]; then
  echo "No active gcloud account. Authenticate before running this script." >&2
  exit 1
fi

echo "Bootstrapping ALSVID production resources"
echo "  project: $GCP_PROJECT_ID"
echo "  region:  $GCP_REGION"
echo "  GitHub:  $GITHUB_REPOSITORY"
echo "  actor:   $active_account"

gcloud config set project "$GCP_PROJECT_ID" >/dev/null

# These APIs are needed by the release workflow, WIF and runtime secret injection.
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project "$GCP_PROJECT_ID" \
  --quiet

if ! gcloud artifacts repositories describe "$GAR_REPOSITORY" \
  --project "$GCP_PROJECT_ID" \
  --location "$GCP_REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$GAR_REPOSITORY" \
    --project "$GCP_PROJECT_ID" \
    --location "$GCP_REGION" \
    --repository-format docker \
    --description "ALSVID immutable production container images" \
    --quiet
fi

ensure_service_account() {
  local account_id="$1"
  local display_name="$2"
  local email="${account_id}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
  if ! gcloud iam service-accounts describe "$email" \
    --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$account_id" \
      --project "$GCP_PROJECT_ID" \
      --display-name "$display_name" \
      --quiet
  fi
}

ensure_service_account "$DEPLOY_SERVICE_ACCOUNT_ID" "ALSVID GitHub production deploy"
ensure_service_account "$RUNTIME_SERVICE_ACCOUNT_ID" "ALSVID Cloud Run runtime"

if ! gcloud iam workload-identity-pools describe "$WIF_POOL_ID" \
  --project "$GCP_PROJECT_ID" \
  --location global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$WIF_POOL_ID" \
    --project "$GCP_PROJECT_ID" \
    --location global \
    --display-name "GitHub Actions" \
    --description "GitHub OIDC identities allowed to deploy ALSVID" \
    --quiet
fi

if ! gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER_ID" \
  --project "$GCP_PROJECT_ID" \
  --location global \
  --workload-identity-pool "$WIF_POOL_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER_ID" \
    --project "$GCP_PROJECT_ID" \
    --location global \
    --workload-identity-pool "$WIF_POOL_ID" \
    --display-name "ALSVID Next GitHub" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --attribute-condition "assertion.repository=='${GITHUB_REPOSITORY}'" \
    --quiet
else
  gcloud iam workload-identity-pools providers update-oidc "$WIF_PROVIDER_ID" \
    --project "$GCP_PROJECT_ID" \
    --location global \
    --workload-identity-pool "$WIF_POOL_ID" \
    --attribute-condition "assertion.repository=='${GITHUB_REPOSITORY}'" \
    --quiet >/dev/null
fi

project_number="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
principal_set="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/${WIF_POOL_ID}/attribute.repository/${GITHUB_REPOSITORY}"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SERVICE_ACCOUNT" \
  --project "$GCP_PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "$principal_set" \
  --quiet >/dev/null

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SERVICE_ACCOUNT" \
  --project "$GCP_PROJECT_ID" \
  --role roles/iam.serviceAccountTokenCreator \
  --member "$principal_set" \
  --quiet >/dev/null

# GitHub deploy identity: administer Cloud Run resources in this dedicated project.
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member "serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role roles/run.admin \
  --condition=None \
  --quiet >/dev/null

# Image publishing is scoped to the single ALSVID Artifact Registry repository.
gcloud artifacts repositories add-iam-policy-binding "$GAR_REPOSITORY" \
  --project "$GCP_PROJECT_ID" \
  --location "$GCP_REGION" \
  --member "serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role roles/artifactregistry.writer \
  --quiet >/dev/null

# The deploy identity may attach only the dedicated ALSVID runtime identity.
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SERVICE_ACCOUNT" \
  --project "$GCP_PROJECT_ID" \
  --member "serviceAccount:${DEPLOY_SERVICE_ACCOUNT}" \
  --role roles/iam.serviceAccountUser \
  --quiet >/dev/null

ensure_secret() {
  local name="$1"
  if ! gcloud secrets describe "$name" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$name" \
      --project "$GCP_PROJECT_ID" \
      --replication-policy automatic \
      --quiet
  fi
  gcloud secrets add-iam-policy-binding "$name" \
    --project "$GCP_PROJECT_ID" \
    --member "serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
    --role roles/secretmanager.secretAccessor \
    --quiet >/dev/null
}

ensure_secret alsvid-database-url
ensure_secret alsvid-r2-access-key
ensure_secret alsvid-r2-secret-key
ensure_secret alsvid-mail-api-key

provider_name="$(gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER_ID" \
  --project "$GCP_PROJECT_ID" \
  --location global \
  --workload-identity-pool "$WIF_POOL_ID" \
  --format='value(name)')"

cat <<EOF

Google Cloud bootstrap complete.

Set these GitHub Environment 'production' variables:
  GCP_PROJECT_ID=$GCP_PROJECT_ID
  GCP_REGION=$GCP_REGION
  GAR_REPOSITORY=$GAR_REPOSITORY
  GCP_WORKLOAD_IDENTITY_PROVIDER=$provider_name
  GCP_DEPLOY_SERVICE_ACCOUNT=$DEPLOY_SERVICE_ACCOUNT
  GCP_RUNTIME_SERVICE_ACCOUNT=$RUNTIME_SERVICE_ACCOUNT

Set these after the Cloudflare R2 bucket exists:
  R2_ENDPOINT=https://<cloudflare-account-id>.r2.cloudflarestorage.com
  R2_BUCKET=<bucket-name>

Secret resource shells now exist, but no secret VALUES were written:
  alsvid-database-url
  alsvid-r2-access-key
  alsvid-r2-secret-key
  alsvid-mail-api-key

Add secret versions only from trusted local/account tooling. Never paste them into Git or workflow YAML.
EOF
