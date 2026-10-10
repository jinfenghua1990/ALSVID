# ALSVID Production Runbook

## Purpose

This runbook turns the repository into a repeatable Test -> Production release path while preserving the authority model in ADR 0003.

Production is not considered accepted until a real managed PostgreSQL instance, Cloudflare R2 bucket and Google Cloud runtime have been configured and a restore drill has succeeded.

## 1. M1 Test acceptance

The M1 is a development/acceptance machine only. From a clean checkout of `main`:

```bash
git pull origin main
bash scripts/test-env-acceptance.sh
```

The script:

1. verifies Docker and Docker Compose
2. builds Web/API/Worker images
3. starts PostgreSQL and MinIO
4. applies migrations explicitly
5. starts Web/API/Worker
6. checks `http://127.0.0.1:4001/api/health`
7. checks the Web root on `http://127.0.0.1:3001/`
8. prints container state

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
| Structured business data | Managed PostgreSQL |
| Binary business files | Cloudflare R2 |
| Runtime secrets | Google Cloud Secret Manager |
| Logs | Google Cloud Logging |

Web and API are configured with zero minimum instances for the initial low-traffic profile. The Worker Pool is a continuous background process and therefore runs one instance when enabled.

## 3. GitHub Production environment

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

No production database password, R2 access key or other credential belongs in GitHub variables or committed files.

## 4. Google Cloud Secret Manager

Create these Secret Manager secrets before the first deployment:

- `alsvid-database-url` — production PostgreSQL connection URL
- `alsvid-r2-access-key` — R2 S3-compatible access key
- `alsvid-r2-secret-key` — R2 S3-compatible secret key

The runtime service account must have permission to read these secrets. The GitHub deploy identity should use Workload Identity Federation rather than a long-lived service-account JSON key.

## 5. First-time Google Cloud resources

Before the workflow can deploy, the selected Google Cloud project must contain:

- Artifact Registry Docker repository matching `GAR_REPOSITORY`
- Cloud Run API enabled
- Artifact Registry API enabled
- Secret Manager API enabled
- Workload Identity Federation provider for this GitHub repository
- deploy service account used by GitHub Actions
- runtime service account used by Web/API/Worker/Migration

The deploy service account needs only the roles required to push images and deploy Cloud Run resources. The runtime service account needs only runtime access such as Secret Manager reads and any network/database access required by the selected PostgreSQL provider.

## 6. Release

Production deployment is intentionally manual until the first real environment is accepted.

Run GitHub Actions -> `ALSVID Production Deploy` -> `Run workflow`.

- leave `release_sha` blank to deploy current `main`
- or enter an older commit SHA already merged into `main`
- type `deploy` in the confirmation field

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

## 7. Rollback

Application rollback is a normal deployment of a previous compatible `main` commit:

1. identify the last known-good commit SHA
2. run `ALSVID Production Deploy`
3. enter that SHA as `release_sha`
4. confirm `deploy`

The workflow rebuilds and deploys that exact source revision.

Database migrations are forward-controlled. A release that contains an irreversible schema change must include a reviewed rollback/forward-fix plan before deployment. Never blindly restore an old database over a live newer database as an application rollback mechanism.

## 8. PostgreSQL backup

Managed PostgreSQL native scheduled backups remain the primary production database backup mechanism. In addition, ALSVID contains a provider-neutral logical backup command for drills and independent copies:

```bash
export DATABASE_URL='postgresql://...'
export ALSVID_RELEASE_SHA="$(git rev-parse HEAD)"
bash scripts/backup-postgres.sh
```

Backups are written under `backups/postgres/` by default and include a SHA-256 checksum when the host provides `sha256sum` or `shasum`.

Do not commit backup files to Git.

## 9. Restore drill

Restore only into an isolated empty/drill database, never directly over production.

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

Production business data must not be accepted until this has succeeded at least once using the chosen managed PostgreSQL provider.

## 10. R2 and Q4 backup

R2 is the production authority for binary objects. Enable the provider's appropriate durability/versioning controls and maintain an independent periodic copy to the Q4 backup location.

The Q4 copy is a backup target only. It is not the production object-store authority and does not run ALSVID production.

A useful object backup must prove both directions:

- object can be copied from R2 to the independent backup
- a sampled object can be restored and its checksum matches PostgreSQL metadata

The exact copy/scheduling command is configured only after the live R2 bucket and Q4 access method exist; credentials must never be committed.

## 11. Logs and operational checks

Cloud Run stdout/stderr flows to Google Cloud Logging. Application logs should remain structured through `@alsvid/observability`.

Initial production checks after every release:

- API health returns 200
- Web root returns 200
- Worker Pool revision is running
- migration job succeeded
- no repeated crash/restart loop
- database connection errors are absent
- no secrets appear in logs

## 12. What still requires live infrastructure

Repository-side packaging, release automation and restore tooling can be completed in GitHub. The following cannot be truthfully marked complete until the actual external resources exist:

- real managed PostgreSQL instance and scheduled backup policy
- real R2 bucket and credentials
- Google Cloud project/WIF/service accounts/Artifact Registry
- first Cloud Run deployment
- first real restore drill
- Q4 independent object/database backup copy

Issue #34 stays open until those live acceptance steps have evidence.
