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

ALSVID maintains one shared Development/Test cloud runtime in `alsvid-dev`; it is not a third environment and never uses Production resources.

## Data isolation rules

- Development/Test resources must never use Production credentials.
- Production database and storage are isolated.
- Test data and files are not promoted into Production.
- Secrets must never be committed to source control.

## Delivery implementation

- Pushes to `develop` deploy automatically to the shared Development/Test Cloud Run project.
- Merges to `main` deploy automatically to Production after the existing production checks.
- Local M1 development remains available for fast feedback and offline work.
