# Current State

## Status

ALSVID-Next is a clean-slate implementation created on 2026-10-10. No production or local business deployment exists yet and no real ALSVID business data needs backward compatibility.

The repository is therefore free to optimize architecture, schemas, APIs and user experience before the first real deployment.

## Authority

This repository is intended to become the sole implementation authority for ALSVID after its bootstrap is accepted. The previous ALSVID and ChaiBen-OS repositories are historical requirement sources only and must not be treated as code dependencies.

## Phase 0 — foundation

In progress:

- repository governance and architecture contract
- domain ownership model
- business-flow specification
- TypeScript monorepo shell
- Next.js web application shell
- NestJS API shell
- background worker shell
- PostgreSQL and S3/R2-compatible local infrastructure
- CI/typecheck/test/build baseline

## Planned capability sequence

1. Identity, access, audit and Partner master
2. Product + engineering + asset foundation
3. Procurement + supplier PO + receipts
4. Production + QC + vehicle birth
5. Inventory + warehouse operations
6. Export logistics: China -> Germany warehouse and China -> dealer direct
7. Dealer + commerce + Shopify fact synchronization
8. Finance: AR/AP, invoice, payment, allocation, settlement, FX and landed cost
9. Vehicle 360 + ownership + customer garage
10. Service/warranty + parts + repair history
11. Communication Center + email marketing/consent/suppression
12. production deployment, observability, backup/restore and automated release workflow

## Not yet implemented

No business domain is considered implemented until code, persistence, authorization, tests and user-visible workflow are all present and documented here.
