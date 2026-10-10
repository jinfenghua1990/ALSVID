# Deployment Model

## Local development and Test

At the current solo/small-team stage, the M1 workstation is the primary development and Test environment. ALSVID does **not** maintain a separate Cloud Run Test environment by default.

The purpose of Test is to verify that a candidate software version, database migration, integration flow and object-storage behavior work correctly before the same Git commit/image is promoted to Production.

Local/Test runtime:

- M1 workstation for development and Test acceptance
- Docker is mandatory for Test acceptance; production-bound code is not accepted based only on a bare macOS process
- PostgreSQL in Docker for local Test data unless a specific integration test requires a managed PostgreSQL target
- Web / API / Worker run as the same production-oriented container definitions used for deployment
- optional local S3-compatible storage or isolated non-production R2 resources only when an object-storage workflow specifically needs them
- Test data is disposable and must never be treated as production business truth

The repository-side Test gate builds the real Web/API/Worker images, starts PostgreSQL, runs migrations, starts all three applications and performs API/Web smoke checks. Container builds used for release acceptance must remain compatible with the Cloud Run production target.

The release rule is **Test the candidate first, then deploy the same version to Production**. A successful local Test does not turn the Test database or Test files into Production data; it approves the software version for production deployment.

A separate cloud Test environment may be added later when one of these conditions becomes real:

1. multiple developers or employees need a shared isolated integration environment;
2. repeated defects appear only in Cloud Run or other cloud-specific services and cannot be reproduced locally;
3. realistic cloud load, IAM, region, managed-service or end-to-end infrastructure testing becomes necessary.

Until one of those conditions exists, maintaining a second cloud runtime is unnecessary operational overhead. The local M1 remains development/Test only and is never the production authority.

## Selected production placement

The production architecture is fixed by ADR 0003:

| Artifact | Production authority |
| --- | --- |
| Software / migrations / CI | GitHub `main` + commit SHA |
| Web | Google Cloud Run Service `alsvid-web` |
| API | Google Cloud Run Service `alsvid-api` |
| Worker | Google Cloud Run Worker Pool `alsvid-worker` |
| Migrations | Google Cloud Run Job `alsvid-migrate` |
| Container images | Google Artifact Registry |
| Structured business data | Neon managed PostgreSQL |
| Binary business files | Cloudflare R2 |
| Runtime secrets | Google Cloud Secret Manager |
| Runtime logs | Google Cloud Logging |
| Offline backup layer | Q4 plus independent database/object copies |

Selecting these providers does not mean the live resources already exist. Issue #34 remains open until real account resources are provisioned, the first production release succeeds and backup/restore evidence exists.

## Provider boundaries

Production provider choices must not leak into Domain rules.

- PostgreSQL is the database contract; Neon is the selected managed provider.
- `@alsvid/ports` is the object-storage contract; the concrete Cloudflare R2 adapter lives in `@alsvid/provider-adapters`.
- Mail and AI remain provider-neutral until their production providers are selected.
- Shopify or another external OMS remains external. ALSVID does not own storefront order, payment or fulfillment orchestration.

## First-time Google Cloud bootstrap

Google Cloud account/project resources are initialized from repository-defined tooling rather than a remembered console checklist.

From an authenticated machine with the Google Cloud CLI:

```bash
export GCP_PROJECT_ID='<project-id>'
export GCP_REGION='<selected-region>'
bash infra/gcp/bootstrap-production.sh
```

The bootstrap is idempotent and creates/configures:

- required Google Cloud APIs
- Artifact Registry Docker repository
- dedicated GitHub deploy service account
- dedicated Cloud Run runtime service account
- GitHub OIDC Workload Identity Pool/provider restricted to `jinfenghua1990/ALSVID-Next`
- least-purpose deployment/runtime IAM bindings
- Secret Manager resource shells for Neon `DATABASE_URL` and R2 credentials

It intentionally does **not** write secret values. It prints the non-secret GitHub `production` Environment variables required by `.github/workflows/production-deploy.yml`.

## Configuration and secrets

Production secret values come from Google Cloud Secret Manager and are read by Cloud Run at deploy/run time. They are not committed, embedded in images or stored as GitHub variables.

Required secret names:

- `alsvid-database-url` — Neon production PostgreSQL connection URL
- `alsvid-r2-access-key` — Cloudflare R2 access key
- `alsvid-r2-secret-key` — Cloudflare R2 secret key

Non-secret GitHub `production` Environment variables are documented in `docs/PRODUCTION_RUNBOOK.md`.

## Release

Production releases are reproducible from a Git commit SHA. `.github/workflows/production-deploy.yml` is manually dispatched until the first live environment is accepted. It builds immutable images, authenticates to Google Cloud through Workload Identity Federation, pushes images, runs migrations explicitly, deploys API/Worker/Web and verifies health.

No production fix is made by editing a running container.

## Portability

Cloud Run, Neon and R2 are selected production providers, not Domain dependencies. Environment-driven configuration and provider ports preserve the ability to replace runtime/database/object-storage infrastructure without redesigning ALSVID business logic.

## Acceptance boundary

Repository-side Docker/Test acceptance is complete. Production is not accepted until all of the following have real evidence:

- Neon production database created and reachable with TLS
- Cloudflare R2 bucket and scoped credentials created
- Google Cloud bootstrap completed
- required Secret Manager values added
- first GitHub Production Deploy succeeds
- API/Web/Worker and database/object-storage access verified live
- PostgreSQL restore drill succeeds against an isolated target
- independent backup/Q4 procedure is proven
- budget/alert/operational monitoring is configured

See `docs/PRODUCTION_RUNBOOK.md`, `docs/RUNTIME_ARCHITECTURE.md` and ADR 0003.
