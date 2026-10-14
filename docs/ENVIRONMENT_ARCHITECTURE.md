# ALSVID Environment Architecture

> Current model (2026-10-14): one Production cloud runtime; local development and CI are validation environments only.

## Environments

- **Production:** Google Cloud project `alsvid-prod`, deployed from reviewed commits on `main`.
- **Local development:** developer workstation and Docker Compose; not a cloud service and not connected to Production by default.
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
Production deployment (alsvid-prod)
```

Production deploy is gated on successful CI for the exact source commit. Only the production workflow may access production deployment credentials. Cloud Development is not a promotion stage.

## Operational rule

Before any infrastructure cleanup or restoration, inspect live resource inventory and confirm ownership and sharing. This document describes repository intent; it is not evidence that a cloud resource currently exists or has been deleted.
