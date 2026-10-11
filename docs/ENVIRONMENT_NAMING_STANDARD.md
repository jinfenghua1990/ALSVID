# ALSVID Environment Naming Standard

## Status

This document is the authoritative environment naming rule for ALSVID.

## Final environment model: two environments only

ALSVID uses exactly two environments:

```text
ALSVID Development
=
Development / Test combined environment

ALSVID Production
=
Formal production environment
```

There is no separate Staging environment at the current stage.

## 1. ALSVID Development

ALSVID Development is the combined Development / Test environment.

It covers:

- coding and debugging;
- Docker-based runtime validation;
- integration testing;
- migration testing;
- release acceptance before production;
- Admin / Dealer / My ALSVID verification.

Resources:

- M1 Mac + Docker Compose
- Neon Test
- Cloudflare R2 Test
- Development/Test secrets

The purpose is to keep development and testing in one controlled non-production environment.

## 2. ALSVID Production

ALSVID Production is the formal production environment.

Resources:

- Google Cloud Run
- Neon Production
- Cloudflare R2 Production
- Google Secret Manager / Production secrets

Production serves real business workloads.

## Environment separation

```text
ALSVID Development
(Development / Test combined)
        |
        | approved version
        v
ALSVID Production
```

Test data and Test files are never promoted as Production data.

## Naming rules

Use:

```text
ALSVID Development
ALSVID Production
```

The meaning of ALSVID Development must always be understood as:

```text
Development / Test combined environment
```

Do not introduce:

```text
ALSVID Test
ALSVID Staging
ALSVID Dev + Test + Staging + Production
```

as separate current environments.

## Future expansion

A separate cloud testing environment may only be introduced when there is a real operational need. Until then ALSVID remains a two-environment architecture.
