# ALSVID Environment Architecture

> Current model (verified 2026-10-25): one Production cloud runtime; GitHub branch work and disposable CI validate changes. Project names below separate observed runtime from migration intent.

## Environments

- **Observed active Production:** Google Cloud project `alsvid-production` in `europe-west1`, confirmed by [successful Production Deploy #40169393607](https://github.com/jinfenghua1990/ALSVID/actions/runs/40169393607), on exact `main` SHA `a9f6a3746ff738a5300d96c465790f3a7f7656b3`.
- **Migration target, not verified live:** independently created Google Cloud project `alsvid-prod`; no successful cutover, matching runtime inventory, traffic or data bindings have been verified. Do not silently retarget the current production environment.
- **Development and business access:** work may be done locally or on GitHub. Every actual deployment and business session, on any number of authorized computers, connects to the same Production identity, business data and R2. Verify real bindings before claiming success; a local snapshot or local database is not Production.
- **CI:** temporary GitHub-hosted runners, PostgreSQL and containers created for a workflow run and removed afterward.
- **Retired:** the shared cloud Development/Test runtime in `alsvid-dev`. Do not assume it exists or recreate it as part of ordinary development.

`ALSVID_ENV` identifies application behavior; `NODE_ENV` identifies framework mode. Neither variable is proof of actual cloud resource bindings.

## Resource isolation

- Production is the single business data and storage authority. Do not initialize, overwrite or delete live data as part of setup or validation.
- Production access must be authorized and secrets kept out of Git and logs. Local business deployments use actual Production services; do not silently substitute local, mock or test data.
- Automated CI may use ephemeral synthetic fixtures without Production credentials. This is a code check, not a separate business environment; do not create a shared test deployment.
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
