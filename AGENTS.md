# ALSVID Agent Contract

This repository is the clean-slate implementation authority for ALSVID.

## Read first

Before changing application behavior or architecture, read in this order:

1. `docs/AI_CONTEXT.md`
2. `docs/ARCHITECTURE_DECISIONS.md`
3. `docs/BUSINESS_BOUNDARY.md`
4. `docs/DATABASE_DECISION.md`
5. `docs/RUNTIME_DECISION.md`
6. `docs/STORAGE_DECISION.md`
7. `docs/ENVIRONMENT_STRATEGY.md`
8. `docs/OPERATIONS.md`
9. `docs/CURRENT_STATE.md`
10. `docs/ARCHITECTURE.md`
11. `docs/DOMAIN_STRUCTURE.md`
12. `docs/DATA_OWNERSHIP.md`
13. `docs/BUSINESS_FLOWS.md`
14. relevant ADRs under `docs/adr/`
15. the current issue/PR and affected `domain.json`
16. `docs/ENVIRONMENT_ARCHITECTURE.md`

Confirmed architecture decisions are not suggestions. Do not replace providers, redraw system boundaries, or add major infrastructure merely because a different stack appears fashionable. First identify the concrete problem, review the recorded rationale, and document the new decision.

## Environment names and communication

- 开发/测试：`ALSVID Development` (Google Cloud project `alsvid-dev`).
- 正式/生产：`ALSVID Production` (Google Cloud project `alsvid-prod`).
- Use these complete names when reporting configuration, links, versions and deployment results.
- Development includes testing; Test is not a third business environment. Runtime test flags and test filenames do not create another environment.
- Keep each environment's database, R2 bucket and credentials isolated.
- Review `docs/ENVIRONMENT_AUDIT_2026-10-12.md` for the dated audit; verify current state before reusing its deployment claims.

## Current rebuild gate

Feature expansion is frozen until Issue #20 is complete. Do not add Finance, Vehicle 360, Service, Communication or other new capability while implemented domains are still being encapsulated.

Existing business code may be reorganized or rewritten freely because ALSVID has never been deployed with real business data.

## Non-negotiable business boundaries

- Do not copy runtime code, migrations, schemas or compatibility layers from ChaiBen-OS or the previous ALSVID repository.
- Historical repositories are requirement references only.
- ALSVID is for the bicycle/export/Europe business.
- 1688, JackYun/吉客云, domestic China settlement/tax workflows and CoffeeBear-specific behavior are out of scope.
- Shopify remains the external commerce/order authority for storefront transactions. ALSVID does not recreate a general-purpose OMS.
- WMS remains the warehouse-execution authority for receiving, picking, packing, dispatch and warehouse-side fulfillment facts.
- ALSVID may store/cache only the external facts needed for Vehicle 360, customer/dealer views, warranty, service, after-sales and reconciliation; do not clone complete Shopify/WMS databases.
- PostgreSQL is authoritative for structured ALSVID business facts. R2/S3-compatible storage holds binary objects only.
- Email and AI integrations are provider-neutral; business domains depend on ports, never vendor SDKs.

## Confirmed infrastructure direction

- Production runtime primary: Google Cloud Run.
- Runtime fallback 1: Railway.
- Runtime fallback 2: Apply.Build.
- Database standard: PostgreSQL.
- Production database primary: Neon PostgreSQL.
- Database migration alternative: Supabase PostgreSQL.
- Object storage primary: Cloudflare R2 behind S3-compatible ports/adapters.
- 开发/测试：ALSVID Development uses shared Cloud Run in alsvid-dev; M1 Mac + Docker provides local development.
- 开发/测试：ALSVID Development uses independent Neon Development and the alsvid-development R2 bucket.
- 正式/生产：ALSVID Production uses Cloud Run in alsvid-prod, Neon Production and the alsvid-production R2 bucket.
- Q4 is not currently part of the Production disaster-recovery architecture; full DR is deferred.

## Architecture rules

- ALSVID remains a modular monolith unless an ADR proves a real need for service separation.
- Follow `docs/DOMAIN_STRUCTURE.md`.
- `domains/<domain>/src/index.ts` is a public facade only once a domain is encapsulated.
- Core/application code cannot import provider SDKs or framework transport code.
- Apps import domains only through `@alsvid/<domain>` public facades.
- Cross-domain writes happen through public application contracts/events, never direct table mutation.
- Domain-specific SQL belongs in that domain's infrastructure layer.
- `@alsvid/database` provides mechanics, not business repositories.
- Long-running work uses durable job/outbox patterns through the worker.
- External systems are adapters behind `@alsvid/ports` or domain-specific ports.
- Prefer explicit state machines and immutable history for vehicles, inventory, money, consent and audit-sensitive facts.
- `pnpm arch:check` is a required CI gate. Do not weaken it to make a shortcut pass.

## Core identity rules

- Partner is the shared legal/business/person identity foundation.
- Product is not Vehicle.
- Product hierarchy: Platform -> Model -> Variant -> SKU -> BOM Revision / Build Specification -> Vehicle.
- One physical bicycle has one Vehicle identity; frame number becomes immutable after birth.
- Ownership changes append history; they do not erase the previous owner period.

## Database

- There is no production migration compatibility obligation yet. Before first production deployment, destructive baseline cleanup is allowed when intentional and reviewed.
- Monetary values require currency and decimal-safe storage.
- Inventory truth is movement-ledger based.
- Finance truth separates document, obligation, payment and allocation.
- Every business fact has one write authority as defined in `docs/DATA_OWNERSHIP.md`.

## External data freshness

At the current stage, Shopify/WMS integration does not require permanent real-time synchronization by default.

- Scheduled synchronization/reconciliation runs at least once per day.
- Customer/staff pages normally use the latest successfully cached ALSVID facts.
- My ALSVID / after-sales may expose `Refresh latest status` for on-demand refresh.
- The UI should show the last successful update time and expected refresh behavior.
- Real-time webhooks are an optional future optimization only when a real business need justifies them.

## Delivery discipline

- Every meaningful change maps to an issue or coherent PR.
- Update `docs/CURRENT_STATE.md` only when behavior or architecture becomes real.
- Add tests for changed invariants.
- Do not add secrets, credentials or real customer data.
- Prefer one clean implementation over compatibility shims for code that has never been deployed.
- Test approval promotes a software version/commit, not Test data.
- Production changes must remain reproducible from GitHub source and documented configuration.