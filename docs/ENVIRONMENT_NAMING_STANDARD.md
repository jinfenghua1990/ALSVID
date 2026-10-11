# ALSVID Environment Naming Standard

## Status

This document is the authoritative environment naming rule for ALSVID.

## Important clarification

ALSVID does **not** use a Dev / Test / Production three-cloud-environment model.

The previous wording of "Development" and "Test" caused ambiguity. The final rule is:

- Local Development is the developer workstation.
- Cloud Test is the shared test environment.
- Cloud Production is the real production environment.

## Environment model

```text
Developer Machine
(M1 Mac + Docker)
        |
        | push code
        v
GitHub
        |
        +----------------+
        |                |
        v                v
ALSVID Test        ALSVID Production
Cloud Environment  Cloud Environment
```

## Local Development

Purpose:

- coding
- debugging
- local validation
- temporary services

Typical resources:

- M1 Mac
- Docker Compose
- localhost services

Local resources are not the authoritative Test or Production environment.

## ALSVID Test

Purpose:

- integration testing
- release verification
- QA
- validating deployment behavior before production

Resources:

- Cloud Test runtime when enabled
- Neon Test resources
- R2 Test resources
- Test secrets

Test data must remain isolated from production.

## ALSVID Production

Purpose:

- real employee access
- dealer access
- customer Vehicle/My ALSVID access
- production business operations

Resources:

- Production Cloud Run
- Neon Production
- R2 Production
- Production Secret Manager

## Naming convention

Use:

```text
ALSVID Test
ALSVID Production
```

Do not use:

```text
ALSVID Development as a cloud environment name
ALSVID Dev/Test mixed naming
```

"Development" refers to the local development process, not a cloud environment.

## GitHub deployment mapping

```text
Pull Request
    |
    v
CI validation

main branch
    |
    v
Production deployment workflow
```

Production deployment keeps manual approval until the operational process is proven.
