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
- Neon Test
- Cloudflare R2 Test
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

ALSVID does not maintain a separate Staging/Test cloud environment at the current stage.

## Data isolation rules

- Development/Test resources must never use Production credentials.
- Production database and storage are isolated.
- Test data and files are not promoted into Production.
- Secrets must never be committed to source control.

## Future expansion

A separate cloud test runtime may be added only when operational requirements justify it, such as multiple teams, external integration callbacks, load testing, or Cloud Run-specific validation needs.
