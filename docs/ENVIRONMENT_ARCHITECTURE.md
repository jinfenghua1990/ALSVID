# ALSVID Environment Architecture

> Current model (verified 2026-10-25): one Production cloud runtime; GitHub branch work and disposable CI validate changes. Project names below separate observed runtime from migration intent.

## Environments

- **Observed active Production:** Google Cloud project `alsvid-production` in `europe-west1`, confirmed by [successful Production Deploy #40169393607](https://github.com/jinfenghua1990/ALSVID/actions/runs/40169393607), on exact `main` SHA `a9f6a3746ff738a5300d96c465790f3a7f7656b3`.
- **Migration target, not verified live:** independently created Google Cloud project `alsvid-prod`; no successful cutover, matching runtime inventory, traffic or data bindings have been verified. Do not silently retarget the current production environment.
- **Development:** GitHub branches and optional remote Codespaces; never use production secrets for development or CI. Do not require workstation-local cloning or Docker.
- **CI:** temporary GitHub-hosted runners, PostgreSQL and containers created for a workflow run and removed afterward.
- **Retired:** the shared cloud Development/Test runtime in `alsvid-dev`. Do not assume it exists or recreate it as part of ordinary development.

`ALSVID_ENV` identifies application behavior; `NODE_ENV` identifies framework mode. Neither variable is proof of actual cloud resource bindings.

## Resource isolation

- Production runtime, database, object storage and secrets are managed separately from local/CI resources.
- Local and CI must never receive Production credentials or write to Production data.
- Tests requiring external providers must use explicitly isolated resources and must not make a CI pass depend on a retired Development deployment.
- Never infer cloud state from a local `.env`, Compose project name, bucket label or historical document.

## Delivery

```text
GitHub branch / pull request
        ↓
CI: checks, tests, container startup and smoke checks
        ↓
review and merge to main
        ↓
CI on exact main commit
        ↓
Production deployment (currently alsvid-production; project migration separate)
```

Production deploy is gated on successful CI for the exact source commit. The workflow selects the deployed GCP project from the GitHub `production` Environment variable `GCP_PROJECT_ID`; document names are not proof of its value. A controlled migration to `alsvid-prod` requires separate resource inventory, IAM/WIF, Neon/R2/Secret Manager, DNS/TLS/auth, validation, traffic cutover and rollback evidence. Cloud Development is not a promotion stage.

## Operational rule

Before any infrastructure cleanup or restoration, inspect live resource inventory and confirm ownership and sharing. This document describes repository intent; it is not evidence that a cloud resource currently exists or has been deleted.
