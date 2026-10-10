# Current State

## Status

ALSVID-Next is a clean-slate implementation created on 2026-10-10. No production or local business deployment exists yet and no real ALSVID business data needs backward compatibility.

The platform-core architecture is established and is the implementation standard for all new work.

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
- `@alsvid/observability` structured logging
- `@alsvid/jobs` PostgreSQL-backed durable jobs with leases, retries and idempotency
- `apps/worker` as a durable-job runner
- centralized API runtime composition and global DomainError-to-HTTP mapping
- request ID / correlation ID propagation into API-originated Audit records
- reusable Web AppShell/navigation primitives in `@alsvid/ui`

## CI architecture gate

Every feature must continue to pass these checks together:

1. PostgreSQL migrations rebuild from an empty PostgreSQL 18 database
2. migrations are safe to run again with nothing pending
3. `pnpm arch:check` passes with no legacy Domain warnings
4. all workspace TypeScript checks pass
5. all PostgreSQL integration tests pass
6. all Web/API/Worker/packages build successfully

## Implemented business baseline

The current implemented business baseline is:

- Identity / access / audit / Partner master
- Product / Engineering / Assets
- Procurement
- Production / QC / Vehicle Birth
- Inventory / Warehouse
- Export Logistics
- Dealer / Commerce / Shopify fact synchronization
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
- production packaging, deployment, backup/restore and release automation — Issue #34
- production provider adapters for object storage, Shopify, mail and AI — Issue #35

Each item must use a dedicated branch, Pull Request and CI. Feature work must not be added directly to `main`.

## Authority

This repository is the implementation authority for the new ALSVID codebase. Previous ALSVID and ChaiBen-OS repositories are historical requirement sources only and must not be treated as code dependencies.

## Product boundary

ALSVID is the integrated operating platform for the bicycle/export business. CoffeeBear domestic workflows, including 1688 and JackYun/吉客云, remain outside ALSVID.
