# ALSVID Agent Contract

This repository is the clean-slate implementation authority for ALSVID.

## Read first

Before changing application behavior, read:

1. `docs/CURRENT_STATE.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DATA_OWNERSHIP.md`
4. `docs/BUSINESS_FLOWS.md`
5. the relevant ADRs under `docs/adr/`
6. the current issue/PR and the code in the affected domain

## Non-negotiable boundaries

- Do not copy runtime code, migrations, database schemas, or API compatibility layers from ChaiBen-OS or the previous ALSVID repository.
- Historical repositories are requirement references only.
- ALSVID is for the bicycle/export/Europe business.
- 1688, JackYun/吉客云, domestic China channel settlement, domestic tax/accounting workflows, and CoffeeBear-specific behavior are out of scope.
- Shopify is an external commerce/OMS integration. Do not recreate a general-purpose OMS inside ALSVID.
- PostgreSQL is the authoritative store for business facts. R2/S3-compatible storage holds binary objects; the database owns object metadata and business linkage.
- Email is provider-neutral. ALSVID owns communication facts, consent, suppression, campaign/send state, summaries and drafts; it does not host an SMTP server.

## Architecture rules

- Start as a modular monolith. Do not introduce microservices without an ADR that proves a deployment/scaling/ownership need.
- Organize code by business domain, not by screen.
- A domain owns its tables, invariants and write use-cases.
- Cross-domain writes happen through application services/contracts/events, never by reaching into another domain's repository internals.
- Read models may join data for dashboards/360 views, but must not become alternate write authorities.
- Long-running integration/workflow work runs through the worker and durable job/outbox patterns.
- External systems are adapters behind interfaces. Core domain code must not import Shopify, mail provider, R2, carrier or payment SDKs directly.
- Prefer explicit state machines and immutable history for vehicles, inventory movements, money allocation, consent and audit-sensitive workflows.

## Core identity rules

- `Partner` is the shared legal/business/person identity foundation. Supplier, factory, dealer, customer, service partner and logistics provider are roles/capabilities, not duplicate master records.
- `Product` is not `Vehicle`.
- Product hierarchy: Platform -> Model -> Variant -> SKU -> BOM Revision / Build Specification -> Vehicle.
- One physical bicycle has exactly one Vehicle identity.
- Frame number is unique and becomes immutable once the vehicle is born/released.
- Vehicle ownership changes are historical events; do not overwrite history.

## Database and migrations

- This repository begins from migration `0001`; there is no legacy migration chain.
- Never rewrite an already released production migration. Before first production deployment, destructive bootstrap changes are allowed if documented in the PR.
- Monetary values require currency and decimal-safe storage. Never use floating point for money.
- Inventory truth is movement-ledger based. Do not treat a mutable quantity field as the sole source of truth.
- Finance truth separates document, obligation, payment and allocation.

## Delivery discipline

- Every meaningful change should map to an issue or clearly scoped PR.
- Update `docs/CURRENT_STATE.md` when a capability becomes real.
- Add or update tests for changed invariants and workflows.
- Keep changes domain-coherent; avoid broad unrelated cleanup in feature PRs.
- Do not add secrets, credentials or real customer data to Git.
- Prefer one coherent implementation over compatibility shims for code that has never been deployed.
