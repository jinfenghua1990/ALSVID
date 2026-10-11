# ALSVID Environment Naming Standard

## Status

This document defines the authoritative two-environment model for ALSVID and must remain consistent with `README.md` and `docs/ENVIRONMENT_STRATEGY.md`.

## Final environment model: exactly two modes

ALSVID currently uses **exactly two environment modes**:

1. **Development / Test** — combined non-production mode
2. **Production** — formal production mode

Do **not** split Development and Test into separate environment tiers at the current stage.

```text
Mode 1: Development / Test
--------------------------------
M1 Mac + Docker
        |
        +--> Neon Test
        +--> R2 Test
        +--> Test-only secrets

Mode 2: Production
--------------------------------
Google Cloud Run
        |
        +--> Neon Production
        +--> R2 Production
        +--> Google Secret Manager / Production secrets
```

## 1. Development / Test

Development and Test are intentionally combined into one non-production mode.

It covers:

- coding and debugging;
- Docker-based local runtime;
- integration testing;
- release acceptance before production;
- migration and connector testing;
- QA for Admin / Dealer / My ALSVID.

Current runtime:

- Compute: **M1 Mac**
- Runtime: **Docker / Docker Compose**
- Database: **Neon Test**
- Object storage: **Cloudflare R2 Test**
- Secrets: **Test-only credentials**

Local PostgreSQL / MinIO may exist only as offline or temporary fallback tools. They are not the normal Test authority.

There is currently **no separate Cloud Run Test environment** and no separate `ALSVID Development` Google Cloud project required for runtime.

## 2. Production

Production is the only formal cloud runtime environment at the current stage.

Resources:

- Compute/runtime: **Google Cloud Run**
- Database: **Neon Production**
- Object storage: **Cloudflare R2 Production**
- Secrets: **Google Secret Manager / Production-only credentials**

Production serves real employee, dealer and customer workloads.

## Naming rules

Use the following terminology in documentation, CI/CD and infrastructure discussions:

```text
Development / Test
Production
```

Avoid introducing these as separate current environments:

```text
Development
Test / Staging
Production
```

Do not create a third environment merely for naming symmetry.

## Google Cloud naming

At the current stage, Google Cloud is used for the **Production runtime**.

Recommended project:

```text
Project name: ALSVID Production
Project ID:   alsvid-prod   (or another available equivalent)
```

The combined Development / Test mode continues to run on M1 + Docker while using Neon Test and R2 Test resources.

## Release flow

```text
M1 + Docker
Development / Test
      |
      | CI / acceptance
      v
GitHub main
      |
      | automated production deployment
      v
Google Cloud Run Production
```

The same approved Git commit/version is promoted to Production. Test data and Test objects are never promoted into Production data.

## Future exception

A separate cloud Test/Staging runtime may be introduced later only if there is a concrete need such as multi-user shared testing, external callback testing, Cloud Run-specific defects or load testing.

Until such a decision is explicitly approved, the ALSVID environment model remains **two modes only**: `Development / Test` and `Production`.
