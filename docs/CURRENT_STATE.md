# Current State

## Status

ALSVID-Next is a clean-slate implementation created on 2026-10-10. No production business deployment exists yet and no real ALSVID business data needs backward compatibility.

The platform-core architecture is established and is the implementation standard for all new work. Repository-side Docker/Test acceptance is complete; live production cloud resources still require account provisioning and first-deployment evidence.

## Platform rebuild — complete

The pre-deployment platform rebuild and encapsulation gate is complete.

All implemented business Domains use the standard internal boundary:

```text
core / application / infrastructure / api
```

`src/index.ts` is a public facade rather than the implementation home for a Domain. Every implemented Domain is marked `encapsulated`, and CI runs `pnpm arch:check` to prevent internal imports, provider leakage and a return to large mixed Domain files.

The platform core includes:

- `@alsvid/kernel` for provider-free shared errors, operation context, clocks and pagination
- `@alsvid/database` query and transaction contracts while Domain SQL remains inside Domain infrastructure adapters
- `@alsvid/ports` for provider-neutral object storage, AI, email and workflow/job integrations
- `@alsvid/provider-adapters` for concrete infrastructure providers; Cloudflare R2 is implemented behind the object-storage port
- `@alsvid/observability` structured logging
- `@alsvid/jobs` PostgreSQL-backed durable jobs with leases, retries and idempotency
- `apps/worker` as a durable-job runner
- centralized API runtime composition and global DomainError-to-HTTP mapping
- request ID / correlation ID propagation into API-originated Audit records
- reusable Web AppShell/navigation primitives in `@alsvid/ui`

## CI and Docker acceptance

Every feature must continue to pass these checks together:

1. PostgreSQL migrations rebuild from an empty PostgreSQL 18 database
2. migrations are safe to run again with nothing pending
3. `pnpm arch:check` passes with no legacy Domain warnings
4. all workspace TypeScript checks pass
5. all PostgreSQL integration tests pass
6. all Web/API/Worker/packages build successfully
7. Test Docker images for Web/API/Worker build successfully
8. Test PostgreSQL starts, migrations run, Web/API/Worker start, and API/Web smoke checks pass

The merged `main` branch currently passes both CI and `ALSVID Test Build` with the full container startup/smoke path. This proves repository-side runtime packaging; it is not evidence that a personal M1 or live production cloud account has already been provisioned.

## Implemented business baseline

The current implemented business baseline is:

- Identity / access / audit / Partner master
- Product / Engineering / Assets
- Procurement
- Production / QC / Vehicle Birth
- Inventory / Warehouse
- Export Logistics
- Dealer / Commerce external-fact synchronization foundation
- Finance foundation: commercial documents, AR/AP obligations, payment evidence, allocations/reversals, explicit FX and Shipment landed-cost allocation

### Finance authority model

Finance deliberately separates commercial documents, obligations and payments. A payment does not overwrite an invoice or obligation; settlement is derived from append-only allocations and reversals. Cross-currency settlement requires explicit FX evidence. Landed cost references Logistics Shipment/cargo facts and does not mutate Inventory quantity.

The Finance foundation is not a general ledger/accounting-suite replacement. It is ALSVID's operational commercial-finance truth layer and may later integrate with external accounting/tax systems through provider-neutral integration contracts.

## Remaining roadmap work

Remaining business/launch work is tracked in GitHub before implementation:

- Vehicle 360 / handover / ownership / My ALSVID — Issue #30
- Service / Warranty / repair and parts history — Issue #31
- Communication Center — Issue #32
- Marketing consent / suppression / campaigns — Issue #33
- live production resource provisioning, first deployment, backup/restore and operational acceptance — Issue #34
- production mail and AI provider adapters — Issue #35

Cloudflare R2 object storage adapter work from Issue #35 is complete through PR #42. Shopify/another OMS remains external; ALSVID does not expand into storefront order, payment or fulfillment orchestration.

Each meaningful change must use a dedicated branch, Pull Request and CI. Feature work must not be added directly to `main`.

## Authority

This repository is the implementation authority for the new ALSVID codebase. Previous ALSVID and ChaiBen-OS repositories are historical requirement sources only and must not be treated as code dependencies.

## Product boundary

ALSVID is the integrated operating platform for the bicycle/export business. CoffeeBear domestic workflows, including 1688 and JackYun/吉客云, remain outside ALSVID.

Shopify or another external OMS remains responsible for storefront order, payment and fulfillment orchestration. ALSVID may normalize only the minimum external facts needed for its own Vehicle, Customer, Finance, Warranty and Service responsibilities.

## Runtime model

ALSVID separates the software program from the environment that runs it.

```text
GitHub
   |
   v
CI / CD
   |
   v
Google Cloud Run
   |
   v
Neon PostgreSQL
   |
   +----> Cloudflare R2
```

- Software program — GitHub (single source of truth, release identity is a commit SHA)
- Runtime environment — Google Cloud Run
- Business database — Neon managed PostgreSQL
- Business files — Cloudflare R2
- Passwords and configuration — Google Cloud Secret Manager
- Logs — Google Cloud Logging
- Backup — GitHub + Neon/PostgreSQL backup + R2 + Q4
- Mail — provider-neutral; concrete production provider not selected yet
- AI — provider-neutral; concrete production provider/model not selected yet

Provider choices above are architecture decisions, not claims that live account resources already exist. Issue #34 remains open until the real Neon, R2 and Google Cloud resources are provisioned, the first production release succeeds, and backup/restore is demonstrated.

A local machine, including the M1 workstation, is a development/Test environment only. It is not
production and does not host the production database authority.

The development path is fixed as: requirement -> GitHub Issue -> branch -> change -> pull request ->
CI -> merge to main -> deploy. See `docs/DEVELOPMENT_WORKFLOW.md`.

The runtime, deployment and secret authority decision is recorded in ADR 0003 and described in
`docs/RUNTIME_ARCHITECTURE.md`.
