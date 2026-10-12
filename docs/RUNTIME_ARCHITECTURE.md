# Runtime Architecture

## Purpose

This document fixes where every ALSVID artifact lives. It separates the software program from the
environment that runs it, so that future work never has to reopen the question of where something
belongs.

The authoritative decision record is ADR 0003.

## Authority map

| Artifact | Authority | Holds |
| --- | --- | --- |
| Software program | GitHub | source, contracts, migrations, infrastructure definitions, CI |
| Runtime environment | Google Cloud Run | the running Web / API / Worker processes |
| Business database | Neon PostgreSQL | authoritative structured business facts |
| Business files | Cloudflare R2 | binary objects only (images, documents, attachments) |
| Passwords and configuration | Google Cloud Secret Manager | production credentials and configuration secrets |
| Logs | Google Cloud Logging | runtime and application logs |
| Backup | GitHub + Neon/database backup + R2 + Q4 | code history, database dumps, object copies, offline copy |

## Software program — GitHub

GitHub is the single source of truth for the software program. A running environment is always
reproducible from a Git commit SHA.

- No code, migration, contract or infrastructure definition lives only on a machine.
- No production fix is applied by editing a running container.
- Release identity is a commit SHA, not a folder name or a timestamp.

## Runtime environment — Google Cloud Run

Cloud Run is the selected runtime platform for Web, API and Worker containers.

- The platform runs the software; it does not own business rules.
- Application code stays provider-neutral so it can also run locally, on a VPS or on a home server
  without redesign. Container and configuration definitions in `infra/` must not assume Cloud Run in Domain code.
- Cloud Run reads configuration and credentials from Secret Manager rather than from committed files.

## Business database — Neon PostgreSQL

Neon is the selected managed PostgreSQL provider for ALSVID production structured data.

- PostgreSQL remains the database contract. Domain and application code must not depend on Neon-specific business semantics.
- Table ownership follows `docs/DATA_OWNERSHIP.md`.
- Runtime connectivity is supplied through `DATABASE_URL`; provider credentials never live in Git.
- Migrations run explicitly as a release step, never implicitly at container start.
- The production database is managed infrastructure and is never hosted on a personal computer.
- A future PostgreSQL provider change must not require rewriting Domain rules.

Selecting Neon records the production provider decision; it does not mean a live Neon project has already been provisioned. Live resource creation and restore evidence remain deployment acceptance work under Issue #34.

## Business files — Cloudflare R2

R2 (S3-compatible) stores binary objects only.

- PostgreSQL stores object metadata, keys, checksums and business links; R2 stores bytes.
- Business files are never committed to the code repository.
- Browser clients never receive storage credentials.
- The concrete R2 adapter lives behind `@alsvid/ports` in `@alsvid/provider-adapters`; provider-specific SDKs do not enter Domain code.
- Live bucket/account provisioning and credential injection remain deployment acceptance work under Issue #34.

## Passwords and configuration — Google Cloud Secret Manager

Production credentials and configuration secrets are held in Secret Manager.

- Secrets are read by the runtime at deploy/run time.
- No secret is committed to Git, embedded in an image, or written into documentation.
- Local development uses local values only, and those values never reach production.

## Logs — Google Cloud Logging

Cloud Logging is the log sink for deployed environments. Application logging goes through
`@alsvid/observability` so the sink can change without touching business code.

## Backup — GitHub + Neon/database backup + R2 + Q4

Backup spans four layers because each protects against a different failure:

1. **GitHub** — all code, contracts, migrations and definitions, with full commit history.
2. **Neon/database backup** — PostgreSQL backup/recovery plus portable logical backups with a proven restore procedure.
3. **R2** — object storage durability and, where required, an independent object copy.
4. **Q4** — an offline/home-server copy so that a single cloud account problem cannot lose everything.

A backup that has never been restored is not a backup. Restore procedures are exercised before
production business data is accepted.

## Local machines

A local machine — including the M1 workstation — is a development environment only.

- It may run Web, API, Worker and PostgreSQL for development/Test acceptance.
- It is never the production environment and never holds the production database authority.
- Losing a local machine must never lose business data or the ability to reproduce the system.

## Provider-neutral external capabilities

Mail remains a provider-neutral platform capability with the current runtime adapter selecting Resend through `MAIL_PROVIDER=resend`; the API key is supplied by Secret Manager and business domains depend on `@alsvid/ports`, not vendor SDKs. AI remains provider-neutral until selected.

Shopify or another external OMS remains external commerce infrastructure. ALSVID does not become an OMS and does not own storefront order, payment or fulfillment orchestration.

## Relationship to other documents

- `docs/ARCHITECTURE.md` — system shape and domain boundaries
- `docs/DEPLOYMENT.md` — environment separation and release model
- `docs/SECURITY.md` — secret handling and high-risk mutations
- `docs/DEVELOPMENT_WORKFLOW.md` — how a change gets from requirement to production
- `docs/adr/0003-runtime-and-deployment-platform.md` — the decision record behind this document
