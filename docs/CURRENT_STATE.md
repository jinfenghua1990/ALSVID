# Current State

## Admin workbench content alignment — 2026-10-16

The canonical `/admin` workbench no longer presents invented order, production, inventory, customer, activity, task or trend examples as current business facts. Unconnected KPIs display `—`; activity, task and trend panels explain when data is unavailable. The page provides direct internal module shortcuts, while Official, Dealer and My links use their separate production portal hostnames (local development retains local preview routes). This is a presentation correction only: live KPI, task, activity and trend APIs remain unconnected. Changes were merged in [PR #193](https://github.com/jinfenghua1990/ALSVID/pull/193) and released from `82501d014420b9bb8a417c503f7ef495e630adba` by [Production Deploy run 38915614241](https://github.com/jinfenghua1990/ALSVID/actions/runs/38915614241). Unauthenticated production checks confirmed `/admin` redirects to `/login?portal=admin&returnTo=%2Fadmin` and the login page returns HTTP 200; the protected workbench requires a signed-in browser session for visual acceptance.

## Original consumer homepage restoration — 2026-10-16

The WWW homepage now implements the user-approved original Penpot migration design (file `9e056cfe-f83f-81f8-8008-cc4972e16647`, page `86ab18b0-fcc4-8052-8008-cc5c73d58530`), rather than V2. It restores the photographic hero, four platform cards, FC1 feature, folding/technology/accessory/service/about sections and dealer banner. Five concept WebP images are served locally with HTML text overlays. Unconfirmed specifications and commerce remain explicitly unavailable; no Shopify transaction flow is added.

Public `/de` and `/en` pages share semantic translation catalogs, a locale registry and a language switcher preserving the current path, query and fragment. The WWW root recommends a browser language on first entry and honors the explicit preference cookie; explicit locale URLs are never redirected to a browser preference. Existing Admin/My/Dealer root routing and session guards remain intact. `/home` redirects to the localized public homepage. This is an implementation record; production completion requires separate CI/deployment and live-page evidence.


## Portal evidence baseline and execution direction — 2026-10-16

Use [PORTAL_DELIVERY_PLAN_2026-10-16.md](PORTAL_DELIVERY_PLAN_2026-10-16.md) for the reviewed source commit, current portal/identity gaps, design links, live HTTP check limits and next tasks. [ADR 0004](adr/0004-portal-experience-commerce-and-supplier.md) records the target boundary. Supplier self-service is a confirmed phased target (#185), not delivered functionality. My garage data remains fixtures; Dealer/Shopify identity and external organization scope require implementation evidence.

Production has already been deployed: the successful workflow [run 38874426159](https://github.com/jinfenghua1990/ALSVID/actions/runs/38874426159) released `15b79ab…`. This does not prove all portals, real business data, backups or the remaining #34 acceptance are complete. Entries below contain older snapshots; pre-deployment/no-data statements must never authorize destructive changes to today's runtime.

## Reviewed Admin design pages — 2026-10-16

The existing Admin fixture renderer now serves 85 reviewed Ardot module/detail/workflow screens through independent protected routes. Module page links, workflow navigation, local table filtering and editable/resettable example forms are available on localhost:3000. Imported records remain explicitly labeled fixtures; approvals, inventory, shipping and provider changes are not executed. The original server-side administrator guard is unchanged.

Web types, production build, architecture checks and five Web tests pass. Authenticated Chrome navigation checked all 85 expected page titles; search, form reset and workflow links were also checked. See ADMIN_DESIGN_SYNC.md and app/_design/sync-manifest.json for scope and source mapping. Production deployment is a separate release step.


> **Current runtime correction (2026-10-14):** Production is the only live cloud target. Cloud Development/Test and its promotion workflow are retired; local Docker and ephemeral GitHub CI are validation environments. Pull requests target `main` and production releases require exact-commit CI. Older entries below are dated historical snapshots and do not describe current runtime state. This repository note does not prove that any cloud resource was deleted.

## Owner homepage vehicle switching — 2026-10-16

The owner homepage now selects a vehicle using desktop arrows, accessible dot buttons, keyboard arrows or a horizontal touch swipe. VIN, frame number, warranty, service activity, detail links and the after-sales request vehicle all follow the same selection. The last selected vehicle ID is remembered per account in browser storage; unavailable IDs fall back to the first currently supplied vehicle, and storage failure does not prevent switching. Single-vehicle and empty garages do not show switching controls. The session check remains server-side, and browser selection cannot add vehicles to the supplied garage.

Local browser checks confirm that selecting another vehicle updates its VIN, warranty, service timeline and after-sales request link; selection survives reload, and keyboard arrow navigation works. Web types, tests, production build and the architecture check pass. Data remains the existing UI fixture layer.

## Local owner interface consolidation — 2026-10-15

The local My ALSVID homepage, garage, vehicle tabs and service pages now use the same owner navigation and layout vocabulary. The former library URL redirects to the first vehicle's manual, or the garage when empty. Vehicle visuals support optional product images and retain the existing SVG illustration when no image is configured. Garage records remain explicitly labeled UI fixtures, not verified ownership or live warranty/service facts.

The optional `ALSVID_DEV_OPEN_PORTAL=1` fixture session applies only to the My ALSVID portal in `NODE_ENV=development`. Admin and Dealer continue to require their normal sessions, including when that flag is enabled; production and test mode never accept the fixture session. Local architecture checks, Web TypeScript, the owner-preview policy tests and the Web production build pass. HTTP checks confirm owner preview routes render and unauthenticated Admin/Dealer requests redirect to login. GitHub CI and deployment require their own evidence.

## Workbench visual redesign — 2026-10-14

The authenticated `/admin` workbench now implements the supplied reference as native Next.js components: a generated scenic bicycle hero, ten module entry cards, four attention cards, four KPI cards, and activity/trend/task panels. Styling is scoped to the workbench and retains the shared navigation, theme switch and internal-session checks. Activity and trend filters respond locally. Unconnected metrics remain explicitly unavailable; no sample counts, timestamps, trend points or tasks are represented as live business facts.

Local validation covers the Web production build, TypeScript, architecture checks, navigation-context tests, unauthenticated redirect, desktop/mobile layout (1680/1280/768/390), both themes and panel filtering. This is an implementation record; cloud deployment requires separate workflow evidence. The retired Development environment is not recreated by this UI change.



## Admin contextual sidebar — 2026-10-14

历史记录：当时的代码整合目标为 Development，后来已决定退役共享云端 Development/Test。当前发布目标只有 Production；生产部署状态仍以对应 commit 的 GitHub workflow 结果为准。

The shared AppShell now places the primary module menu in the header and the selected module's grouped secondary menu in a left sidebar, with the workspace on the right. The former horizontal secondary navigation row is removed. Desktop sidebar scrolling stays independent below the header; mobile keeps the collapsible navigation menu. Context links retain the selected module when different modules share a destination such as `/overview` or `/vehicle360/search`, including after reload and secondary navigation.

Implementation validation covers navigation-context regressions, UI/Web TypeScript checks, the Web production build, and browser layout/interaction checks across all 11 primary modules, sticky positioning, light/dark themes and mobile navigation. This entry records repository implementation; it does not prove the version is deployed to a user's current URL. Deployment and acceptance must be verified separately.

## Historical foundation status — 2026-10-10 (not current deployment evidence)

ALSVID-Next was created as a clean-slate implementation on 2026-10-10. The original baseline had no production deployment or business-data compatibility obligation; those are historical conditions, not assumptions about the current runtime.

The platform-core architecture is established and remains the standard. The original account-provisioning/first-deployment checklist below is historical; use current workflow evidence and open acceptance tasks for live status.

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

## M1 Test update automation — removed (2026-10-14)

The M1 Test update automation (`scripts/macos-test-auto-update.mjs`, `scripts/test-env-acceptance.sh` and `docs/M1_TEST_AUTO_UPDATE.md`) has been removed. Production is the only live target; there is no Test environment. Release acceptance is handled entirely by exact-commit CI.

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
- 历史记录（已失效）：当时的 M1 updater 和 Development bootstrap 依赖云端 Development Build；现已改为只依赖主分支 CI，本地更新不创建或访问云端 Development。

历史状态（已失效）：当时以共享 Development 作为生产前置门禁，并要求 main 与 develop 同步。当前该门禁已由 exact-commit CI 和 Production 发布检查替代。

历史状态（已失效）：旧流程使用 `alsvid-dev` 与 `alsvid-prod` 两套云资源。当前仓库不再包含 Development 部署链；只在 Production 工作流中部署。此说明不证明旧云资源已删除。
