# ALSVID Production Runbook

## Purpose

This runbook turns the repository into a repeatable Test -> Production release path while preserving the authority model in ADR 0003.

Repository-side packaging and Docker runtime acceptance are complete. Production is **not** considered accepted until the real Neon PostgreSQL project, Cloudflare R2 bucket and Google Cloud resources have been configured, the first Cloud Run deployment has succeeded, and backup/restore evidence exists.

## 1. M1 / local Test acceptance

The M1 is a development/Test machine only. From a clean checkout of `main`:

```bash
git pull origin main
bash scripts/test-env-acceptance.sh
```

The core-runtime script:

1. verifies Docker and Docker Compose
2. builds Web/API/Worker images
3. starts PostgreSQL
4. applies migrations explicitly
5. starts Web/API/Worker
6. checks `http://127.0.0.1:4001/api/health`
7. checks the Web root on `http://127.0.0.1:3001/`
8. prints container state

GitHub `ALSVID Test Build` runs the same core acceptance shape and is currently green on `main`.

Real R2 access is intentionally **not** faked as part of the core Docker smoke check. R2 production acceptance requires the real bucket and scoped credentials.

Stop the Test environment with:

```bash
docker compose -f infra/docker-compose.test.yml down
```

Use `down -v` only when Test data may be discarded.

## 2. Production runtime shape

| Process/data | Production placement |
| --- | --- |
| Web | Cloud Run Service `alsvid-web` |
| API | Cloud Run Service `alsvid-api` |
| Worker | Cloud Run Worker Pool `alsvid-worker` |
| Migrations | Cloud Run Job `alsvid-migrate` |
| Container images | Google Artifact Registry |
| Structured business data | Neon managed PostgreSQL |
| Binary business files | Cloudflare R2 |
| Runtime secrets | Google Cloud Secret Manager |
| Logs | Google Cloud Logging |
| Offline/independent backup layer | Q4 plus portable database/object copies |

Web and API use zero minimum instances for the initial low-traffic profile. The Worker Pool is a continuous background process and therefore runs one instance when enabled.

Neon and R2 are selected providers, not Domain dependencies. PostgreSQL and S3-compatible ports remain the application boundaries.

## 3. First-time Google Cloud bootstrap

Do not build the first environment from a remembered console checklist. Use the repository bootstrap script from an authenticated machine with Google Cloud CLI installed.

Required inputs:

```bash
export GCP_PROJECT_ID='<project-id>'
export GCP_REGION='<selected-region>'
```

Optional names have safe defaults and may be overridden:

```bash
export GAR_REPOSITORY='alsvid'
export GITHUB_REPOSITORY='jinfenghua1990/ALSVID'
export WIF_POOL_ID='github'
export WIF_PROVIDER_ID='alsvid-next'
export DEPLOY_SERVICE_ACCOUNT_ID='alsvid-github-deploy'
export RUNTIME_SERVICE_ACCOUNT_ID='alsvid-runtime'
```

Run:

```bash
bash infra/gcp/bootstrap-production.sh
```

The script is idempotent. It:

1. enables Cloud Run, Artifact Registry, Secret Manager, IAM Credentials and STS APIs
2. creates the Artifact Registry Docker repository when missing
3. creates dedicated deploy/runtime service accounts when missing
4. creates a GitHub OIDC Workload Identity Pool/provider restricted to this repository
5. grants the GitHub deploy identity Cloud Run deployment and Artifact Registry publishing permissions
6. allows that deploy identity to attach only the dedicated runtime service account
7. creates the three required Secret Manager resource shells
8. grants the runtime service account Secret Manager Secret Accessor on those secrets
9. prints the non-secret GitHub production variables to configure

The script never writes secret **values**.

## 4. GitHub Production environment

Create a GitHub Environment named `production`. Prefer an approval rule before deployment once more than one person can deploy.

Configure these GitHub **variables** (not credentials):

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_REPOSITORY`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOY_SERVICE_ACCOUNT`
- `GCP_RUNTIME_SERVICE_ACCOUNT`
- `R2_ENDPOINT`
- `R2_BUCKET`

`infra/gcp/bootstrap-production.sh` prints the Google Cloud values. R2 values come from the real Cloudflare account/bucket.

No production database URL, R2 access key or other credential belongs in GitHub variables or committed files.

## 5. Neon production PostgreSQL

Create the ALSVID production database in Neon and use a TLS-enabled PostgreSQL connection URL. PostgreSQL remains authoritative for structured ALSVID business facts.

Before entering real business data:

- confirm the selected Neon region and project
- use a dedicated production role/database
- enable/confirm the chosen Neon backup/recovery policy
- keep the connection URL only in Secret Manager
- run migrations explicitly through the release job
- complete the restore drill in section 10

Once the connection URL exists, add it as a Secret Manager **version** without committing it:

```bash
read -rsp 'Neon DATABASE_URL: ' DATABASE_URL && echo
printf '%s' "$DATABASE_URL" | gcloud secrets versions add alsvid-database-url \
  --project "$GCP_PROJECT_ID" \
  --data-file=-
unset DATABASE_URL
```

## 6. Cloudflare R2

Create the production R2 bucket and a scoped S3-compatible credential for ALSVID.

Repository support is already implemented in `@alsvid/provider-adapters` behind `ObjectStoragePort` and includes upload/head/delete, presigned read/write URLs and SHA-256 evidence.

Required non-secret runtime values:

```text
OBJECT_STORAGE_PROVIDER=r2
OBJECT_STORAGE_ENDPOINT=https://<cloudflare-account-id>.r2.cloudflarestorage.com
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=<bucket-name>
```

Add the credential values to the existing Secret Manager resources:

```bash
read -rsp 'R2 access key: ' R2_ACCESS_KEY && echo
printf '%s' "$R2_ACCESS_KEY" | gcloud secrets versions add alsvid-r2-access-key \
  --project "$GCP_PROJECT_ID" \
  --data-file=-
unset R2_ACCESS_KEY

read -rsp 'R2 secret key: ' R2_SECRET_KEY && echo
printf '%s' "$R2_SECRET_KEY" | gcloud secrets versions add alsvid-r2-secret-key \
  --project "$GCP_PROJECT_ID" \
  --data-file=-
unset R2_SECRET_KEY
```

Never use an account-wide Cloudflare token as an application storage credential when a bucket-scoped credential can satisfy the requirement.

## 7. Secret Manager authority

The production workflow expects these secret names:

- `alsvid-database-url` — Neon production PostgreSQL connection URL
- `alsvid-r2-access-key` — R2 S3-compatible access key
- `alsvid-r2-secret-key` — R2 S3-compatible secret key

The runtime service account has Secret Manager Secret Accessor. GitHub authenticates to Google Cloud through Workload Identity Federation; no long-lived Google service-account JSON key belongs in GitHub.

## 8. First production release

After a reviewed change is merged into `main`, Production deployment runs automatically from GitHub Actions. The workflow remains manually dispatchable for a controlled release or rollback.

For a normal manual release or rollback, run GitHub Actions -> `ALSVID Production Deploy` -> `Run workflow`.

- leave `release_sha` blank to deploy current `main`
- or enter an older commit SHA already merged into `main`
- type `deploy` in the confirmation field

For an automatic release, no manual action is needed after the PR is merged into `main`. The `main` branch must remain protected so the CI and Docker/Test acceptance checks pass before a merge is allowed.

The workflow refuses a commit that is not contained in `main`.

The workflow performs these steps in order:

1. checkout and validate release SHA
2. build Web/API/Worker images before cloud authentication
3. authenticate using Workload Identity Federation
4. push immutable images tagged with the Git commit SHA
5. run database migrations in `alsvid-migrate`
6. deploy API
7. deploy the continuous Worker Pool
8. verify API `/api/health`
9. deploy Web with the resolved API URL
10. verify the Web root

A release is identified by its Git commit SHA. Do not patch a running container.

No custom domain is required for the first acceptance. Cloud Run provider URLs are sufficient until a custom domain is intentionally introduced.

## 9. Rollback

Application rollback is a normal deployment of a previous compatible `main` commit:

1. identify the last known-good commit SHA
2. run `ALSVID Production Deploy`
3. enter that SHA as `release_sha`
4. confirm `deploy`

The workflow rebuilds and deploys that exact source revision.

Database migrations are forward-controlled. A release that contains an irreversible schema change must include a reviewed rollback/forward-fix plan before deployment. Never blindly restore an old database over a live newer database as an application rollback mechanism.

## 10. PostgreSQL backup and restore drill

Neon native recovery/backup capability is the primary managed-database protection layer. ALSVID also contains provider-neutral logical backup commands for drills and independent copies.

Create a logical backup:

```bash
export DATABASE_URL='postgresql://...'
export ALSVID_RELEASE_SHA="$(git rev-parse HEAD)"
bash scripts/backup-postgres.sh
```

Backups are written under `backups/postgres/` by default and include a SHA-256 checksum when the host provides `sha256sum` or `shasum`. Do not commit backup files to Git.

Restore only into an isolated empty/drill database, never directly over production:

```bash
export RESTORE_DATABASE_URL='postgresql://...restore-drill...'
export ALSVID_ALLOW_RESTORE=yes
bash scripts/restore-postgres.sh backups/postgres/<backup>.dump
```

After restore:

1. run `pnpm db:migrate` against the restore target
2. run API health checks
3. run a representative read-only business-data verification
4. record the date, backup identifier and result
5. destroy the drill database when evidence has been recorded

Production business data must not be accepted until this has succeeded at least once with Neon as the selected production PostgreSQL provider.

### Client-version and credential safety

The production Neon server currently runs PostgreSQL 18.6. Use a PostgreSQL 18 client for
`pg_dump` and `pg_restore`; an older client may refuse the backup before making any change.
When running the clients in Docker, provide credentials through a protected `PGPASSFILE` or
standard input mechanism. Never pass the complete connection URL as a command-line argument,
because local process listings can expose it.

## 11. R2 and Q4 backup

R2 is the production authority for binary objects. Enable the appropriate Cloudflare durability/versioning controls and maintain an independent periodic copy to the Q4 backup location.

The Q4 copy is a backup target only. It is not the production object-store authority and does not run ALSVID production.

A useful object backup must prove both directions:

- object can be copied from R2 to the independent backup
- a sampled object can be restored and its SHA-256 matches PostgreSQL metadata

The exact Q4 transfer/scheduling command is configured only after the live R2 bucket and Q4 access method exist; credentials must never be committed.

## 12. Logs, cost guardrails and operational checks

Cloud Run stdout/stderr flows to Google Cloud Logging. Application logs remain structured through `@alsvid/observability`.

Before accepting production, configure Google Cloud billing budget/alerts appropriate to the ALSVID project. A budget alert is an operational guardrail; it is not assumed to hard-stop all Google Cloud spending.

Initial production checks after every release:

- API health returns 200
- Web root returns 200
- Worker Pool revision is running
- migration job succeeded
- no repeated crash/restart loop
- Neon database connectivity is healthy
- R2 read/write/checksum smoke succeeds
- no secrets appear in logs

## 13. What still requires live account resources

The repository now contains Docker packaging, release automation, R2 adapter, Google Cloud bootstrap, backup/restore tooling and production documentation. The following cannot be truthfully marked complete until the actual external resources exist:

- real Neon project/database and backup/recovery configuration
- real R2 bucket and scoped credentials
- Google Cloud project bootstrap executed by an authorized account
- GitHub `production` Environment variables configured
- Secret Manager versions populated from trusted local/account tooling
- first Cloud Run deployment
- first live Production R2 read/write/checksum verification
- first real Neon restore drill
- Q4 independent object/database backup copy
- budget/alerts and operational monitoring acceptance

Issue #34 stays open until those live acceptance steps have evidence.

## 14. Latest operational acceptance record

On 2026-10-11 the Development and Production R2 buckets passed real temporary-object
acceptance: put, metadata head, signed read with HTTP 200, SHA-256 verification, delete, and
post-delete absence. Both temporary objects were removed.

The production Neon restore drill remains pending. The host PostgreSQL 16 client was rejected
by the PostgreSQL 18.6 server, and a retry was stopped before any database mutation after
detecting unsafe command-line credential exposure. The next drill must use PostgreSQL 18 client
tools and protected credential input, then record the isolated restore target and checksum in
Issue #61.

The production rollback workflow is configured for any merged `main` SHA, but no live rollback
was triggered during this audit. Google Cloud billing has no budget configured yet; the monthly
threshold must be chosen explicitly before creating the alert.
