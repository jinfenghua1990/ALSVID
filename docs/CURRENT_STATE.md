# Current State

## Admin contextual sidebar — 2026-10-14

Release reconciliation now incorporates the independent main homepage, Admin menu/detail and compact-workspace updates into Development while retaining the selected-module navigation fix. Daily usage targets Production; Development remains for release verification. Production deployment completion is a separate claim and must be supported by the workflow result for the reconciled source tree.

The shared AppShell now places the primary module menu in the header and the selected module's grouped secondary menu in a left sidebar, with the workspace on the right. The former horizontal secondary navigation row is removed. Desktop sidebar scrolling stays independent below the header; mobile keeps the collapsible navigation menu. Context links retain the selected module when different modules share a destination such as `/overview` or `/vehicle360/search`, including after reload and secondary navigation.

Implementation validation covers navigation-context regressions, UI/Web TypeScript checks, the Web production build, and browser layout/interaction checks across all 11 primary modules, sticky positioning, light/dark themes and mobile navigation. This entry records repository implementation; it does not prove the version is deployed to a user's current URL. Deployment and acceptance must be verified separately.

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

## Internal Admin UI foundation

The Internal Admin now has a Chinese-first shell foundation aligned with Issue #52:

- grouped navigation for Product, Operations, Commercial, Vehicles & Service, People and System areas;
- Chinese overview and login surfaces;
- explicit `规划中` / `预留` / `待配置` states for unfinished integrations instead of fake working links;
- a persistent Test environment banner and `[测试] ALSVID` document title outside Production;
- mobile navigation instead of hiding the desktop rail without replacement;
- an Employee Center scaffold for the centralized employee/provisioning direction in Issue #51;
- an Environment & Infrastructure surface that exposes safe runtime/resource metadata and configured/missing status without revealing database URLs, passwords, R2 secret keys or provider tokens;
- the Product & Engineering workbench is converged onto the shared Chinese AppShell rather than maintaining its own independent navigation shell;
- the Commerce workbench is converged onto the shared Chinese AppShell and treats Shopify, Amazon and future providers as external Commerce channels rather than separate ALSVID OMS implementations.

The Amazon Marketplace phase-one scaffold from Issue #55 makes `AMAZON` a valid Commerce provider and supports safe channel/account references plus external product/SKU mapping. It does **not** mean a Seller Central account, SP-API authorization, Amazon order polling, FBA synchronization or settlement import is connected. Amazon credentials/tokens are not stored or rendered by the Commerce UI.

This is a shell/foundation milestone, not a claim that all existing business workbenches have already been redesigned or fully localized. Existing deep domain screens will converge on the shared Chinese Internal Admin patterns incrementally.

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
- Amazon live SP-API adapter, authorization, ingestion and operational monitoring after the phase-one Commerce scaffold — Issue #55

Cloudflare R2 object storage adapter work from Issue #35 is complete through PR #42. Shopify, Amazon or another marketplace/OMS remains external; ALSVID does not expand into storefront/marketplace checkout, payment capture or provider-owned fulfillment orchestration.

Each meaningful change must use a dedicated branch, Pull Request and CI. Feature work must not be added directly to `main`.

## Authority

This repository is the implementation authority for the new ALSVID codebase. Previous ALSVID and ChaiBen-OS repositories are historical requirement sources only and must not be treated as code dependencies.

## Product boundary

ALSVID is the integrated operating platform for the bicycle/export business. CoffeeBear domestic workflows, including 1688 and JackYun/吉客云, remain outside ALSVID.

Shopify, Amazon or another external OMS/marketplace remains responsible for its storefront/marketplace order, payment and provider-owned fulfillment orchestration. ALSVID may normalize only the minimum external facts needed for its own Vehicle, Customer, Finance, Warranty and Service responsibilities.

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
- Mail — Resend transactional delivery is wired for verification and password reset; Development requires its own `alsvid-mail-api-key` secret and Production uses the verified `chaibenn.com` sender
- AI — provider-neutral; concrete production provider/model not selected yet

Provider choices above are architecture decisions, not claims that live account resources already exist. Issue #34 remains open until the real Neon, R2 and Google Cloud resources are provisioned, the first production release succeeds, and backup/restore is demonstrated.

A local machine, including the M1 workstation, is a development/Test environment only. It is not
production and does not host the production database authority.

The development path is fixed as: requirement -> GitHub Issue -> branch -> change -> pull request ->
CI -> merge to main -> deploy. See `docs/DEVELOPMENT_WORKFLOW.md`.

The runtime, deployment and secret authority decision is recorded in ADR 0003 and described in
`docs/RUNTIME_ARCHITECTURE.md`.

## Internal Admin UI consistency — 2026-10-11

Existing AppShell workbenches now share a compact internal header with a Portal Launcher link, collapsible navigation groups, visible active-page state and readable operational typography. Existing module routes and disabled roadmap entries are retained. The Environment page explicitly labels Web-only configuration visibility; missing Web secrets are not presented as API/Worker connection failures. Live backend connection health is not implemented by this UI change.

The old portal launcher is now a compatibility redirect. `/` and `/portal-launcher` lead to the authenticated Admin Center, while `/login` is the single email/password login center and successful authentication routes directly to `/admin`. Password reset uses one-time 30-minute tokens, sends through the configured transactional mail provider, and revokes existing sessions after completion. The Environment page is dynamically rendered so runtime metadata is not frozen at build time. M1 Docker images require pulling main and rebuilding Web before these changes appear locally.

## M1 Test update automation — repository support

The macOS per-user updater in `scripts/macos-test-auto-update.mjs` can discover an existing checkout, register five-minute checks and update a separate managed Test checkout only after current-main CI and Development/Test Build pass. It reuses Test configuration/project identity and checks service health. It does not change Production or developer branches. See `docs/M1_TEST_AUTO_UPDATE.md`. Installation and end-to-end acceptance on the actual M1 are pending; the repository capability does not claim a registered local agent.

## Portal and transaction reliability follow-up — 2026-10-12

- The business overview navigation targets `/overview`, while `/` remains the public portal launcher.
- Portal environment labels use the canonical names 开发/测试：ALSVID Development and 正式/生产：ALSVID Production. The launcher no longer claims unmeasured service health or a fabricated update time/version; it reports 尚未检测 for service health and the signed-in state instead.
- Development and Production Web releases inject `ALSVID_RELEASE_SHA`; the launcher and environment diagnostics show the deployed source identity when available.
- The existing Vehicle 360 entry accurately labels the available Production/QC/Vehicle Birth foundation; handover and ownership remain roadmap work.
- Database transaction error listeners are scoped to one checkout and removed before release. Connections with client errors or failed rollback are discarded without hiding the original operation error. Regression tests cover repeated client reuse and failure cleanup.
- Schema migrations hold one dedicated connection for the advisory lock, because `pg_advisory_lock` is session-scoped and a pooled unlock could otherwise land on a different connection.
- Every Internal Admin surface that renders the AppShell requires a validated internal session, including `/overview`.
- Portal and Internal Admin navigation never link to routes this application does not implement; planned areas render as labelled, non-clickable entries.
- Commerce and Inventory request the existing `/v1/product/catalog` endpoint instead of a non-existent `/v1/product` collection.
- The M1 Test updater waits for the workflow name that actually exists (`ALSVID Development Build`), and the Development bootstrap script creates the R2 secret names that the Development deployment workflow reads.

Delivery state: the shared Development environment deploys successfully, and Production stays blocked until the same source has been accepted in Development. At the time of writing, Production runs fail the release gate because `main` carried commits that had never been on `develop`; restoring that history is the prerequisite for the next Production release.

Cloud acceptance remains separate: Google Secret Manager is still the secret authority, with separate resources in `alsvid-dev` and `alsvid-prod`. The Development workflow currently deploys Web and API with migration job and health verification; the Production workflow additionally builds and deploys the continuous worker pool. This follow-up does not provision cloud resources and does not claim a new successful Production deployment.
