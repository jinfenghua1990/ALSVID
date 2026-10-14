# Environment Strategy

## Purpose

This document defines the ALSVID environment architecture.

ALSVID uses two environments only:

```text
ALSVID Development
=
Development / Test combined environment

ALSVID Production
=
Formal production environment
```

## ALSVID Development

ALSVID Development combines development and testing responsibilities.

Purpose:

- software development;
- debugging;
- Docker runtime validation;
- integration testing;
- release acceptance before production.

Resources:

- M1 Mac
- Docker / Docker Compose
- Google Cloud Run shared Development/Test services
- Neon Development
- Cloudflare R2 Development
- Development/Test secrets

Docker is the required acceptance path because Production runs with containerized workloads.

## ALSVID Production

Purpose:

- real employee access;
- dealer access;
- customer Vehicle/My ALSVID access;
- production business operations.

Resources:

- Google Cloud Run
- Neon Production
- Cloudflare R2 Production
- Production secrets managed outside source control

## Release flow

```text
M1 + Docker
ALSVID Development
(Development / Test combined)
        |
        | approved Git commit
        v
ALSVID Production
Google Cloud Run
```

ALSVID maintains one shared Development/Test cloud runtime in `alsvid-dev`; it is not a third environment and never uses Production resources.

## Data isolation rules

- Development/Test resources must never use Production credentials.
- Production database and storage are isolated.
- Test data and files are not promoted into Production.
- Secrets must never be committed to source control.

## Delivery implementation

- 开发/测试：`ALSVID Development`; 正式/生产：`ALSVID Production` are the canonical communication names.
- Pushes to `develop` deploy to ALSVID Development after CI and container acceptance pass.
- Merges to `main` deploy to ALSVID Production only if identical source content already passed Development deployment and CI/container acceptance.
- Successful Production releases synchronize `main` history back into `develop` so Development remains ahead or equal in software content. Explicit rollback is the exception and can select a previously successful Production release.
- Local M1 development remains available for fast feedback and offline work.

## 2026-10-14 decision: Production-only runtime and future restoration

Owner-approved target: retire the separate cloud Development/Test runtime, after release-chain migration and verification. Preserve this design record, but do not retain a deployed Development application version.

- Production is the sole live cloud runtime; main is the release source of truth.
- Preserve feature branches, pull requests, CI, tests, builds, and local development. They are not independent deployed cloud environments.
- Replace Development-dependent promotion with PR checks and a verified Production release pipeline BEFORE disabling old gates.
- Compare full Git trees of main and develop, reconcile differences into main by reviewed PR, and verify the actual Production deployed image and health.
- Inventory Development-only Cloud Run, Artifact Registry, Neon, R2, secrets, GitHub environment settings, and other billable resources. Delete only confirmed Development assets, after checking they are not shared with Production.
- Preserve Production history, rollback capability, and all business/application source code. Do not retain a separate Development release/version just for rollback.
- Disable obsolete Development workflow triggers only once replacement deployment is verified.

Future restoration plan (documentation only, no live version):
1. Recreate isolated Development cloud resources from current main and infrastructure guidance in infra/gcp/bootstrap-development.sh and docs/RELEASE_FLOW.md.
2. Provision fresh Development-only database, R2, IAM and secrets; never reuse Production credentials or customer data.
3. Restore CI/smoke-test deployment and release gates if staged releases become necessary.
4. Record endpoints, ownership, cost controls, and teardown procedure.

Status: decision documented; workflow migration, full-tree reconciliation, and cloud resource deletion remain pending verification. Earlier sections describe the historical architecture.
