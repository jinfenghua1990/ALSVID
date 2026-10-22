# Current State

## 2026-10-22 release and acceptance audit snapshot

This dated snapshot separates repository state from live production acceptance. Do not treat a merged PR or a successful workflow as proof that every business path is complete.

### Release evidence
- The last confirmed WWW-only production release before the catalogue-navigation correction was commit `b3f6bc89b34bde6ab058f1df38fc37bfc795b19d`, from [WWW Production Deploy #39712257014](https://github.com/jinfenghua1990/ALSVID/actions/runs/39712257014), which succeeded.
- The homepage/catalogue correction [PR #302](https://github.com/jinfenghua1990/ALSVID/pull/302) merged at 2026-10-22 03:22 UTC. Its main-branch commit is undergoing CI; do not call it live until a later exact-SHA WWW deployment succeeds and the production route is rechecked.
- [PR #297](https://github.com/jinfenghua1990/ALSVID/pull/297) added BIKE / ACCESSORY / SERVICE_PART product types and safe homepage Model-ID bindings, including automatic matching and authorized manual override/reset. [Full Production Deploy #39707705037](https://github.com/jinfenghua1990/ALSVID/actions/runs/39707705037) succeeded on `a0d46c4e5b7424fdde548813cd4261184325b46c`, whose parent is the #297 merge commit.
- [PR #299](https://github.com/jinfenghua1990/ALSVID/pull/299) added the first audit-gated public bike catalogue publication slice for FC1 / FC2 and was included in that full Production Deploy. It does not complete accessory publication, compatibility, price/stock, order or payment flows.
- The dated browser snapshot of the pre-#302 production site showed the homepage “browse accessories” CTA and footer still pointing to the homepage's own anchor; `/{locale}/bikes` showed FC1 / FC2 only and had no left-side model index. PR #302 fixes those gaps and includes L7 / L8 as preview-only model cards.

### Recent UI work already merged
- Portal password/email login and reset UI: [PR #254](https://github.com/jinfenghua1990/ALSVID/pull/254).
- Visible public return-home link: [PR #272](https://github.com/jinfenghua1990/ALSVID/pull/272).
- Dealer application modal and designed login page: [PR #274](https://github.com/jinfenghua1990/ALSVID/pull/274).
- Supplier workspace UI refinement: [PR #269](https://github.com/jinfenghua1990/ALSVID/pull/269).
- First-party preview cart with local quantity badge and add-selection controls: [PR #275](https://github.com/jinfenghua1990/ALSVID/pull/275). This is not a live purchase system: price, payment, order creation and stock reservation remain disabled until approved commercial and PSP prerequisites are satisfied.

### Open work / external acceptance
- [Issue #212](https://github.com/jinfenghua1990/ALSVID/issues/212): Admin remains an ongoing real-business-closure program. Fixture pages, APIs and deployment are not proof of real save/approve/withdraw, role/data-scope, audit and error-recovery acceptance.
- [Issue #263](https://github.com/jinfenghua1990/ALSVID/issues/263): accessories still need reviewed publication, verified model/variant/SKU/BOM compatibility and approved price/stock before any real checkout.
- [Issue #265](https://github.com/jinfenghua1990/ALSVID/issues/265): the official FC1 reservation recipient is still empty. Do not invent an address; a responsible person must supply and verify the real mailbox before rebuilding the frontend.
- [Issue #295](https://github.com/jinfenghua1990/ALSVID/issues/295): the provider-neutral 3PL/WMS contract is documented, but real warehouse API docs, credentials and test access are not yet available.
- [Issue #304](https://github.com/jinfenghua1990/ALSVID/issues/304) / [PR #305](https://github.com/jinfenghua1990/ALSVID/pull/305): PageSpeed mobile lab report showed score 68, LCP 15.1 s, and a roughly 2.47 MB homepage KV PNG. The responsive-image optimization is pending CI, browser/network validation and a new PageSpeed measurement.
- The sitemap route has been implemented and deployed, but the observed Google Search Console snapshot had no submitted sitemap row. Submission and URL inspection in Search Console are separate manual acceptance steps.

## FC1 promotional / email-reservation-only state — 2026-10-20

The current FC1 customer journey is **product promotion + model/colour preference preview + email reservation enquiry only**. Do not expose online ordering, a cart, checkout, payment, order creation or stock reservation. The configurator keeps the actual reference-bike photography, model selector, colour-preview behavior and grouped specifications. Its email CTA reads the optional `NEXT_PUBLIC_FC1_RESERVATION_EMAIL` build-time variable. If the variable is missing or malformed, the CTA remains disabled and explicitly states that the reservation email will be added later; never invent a recipient address. When configured, the CTA opens the customer's own email client with a localized subject/body containing the selected model and colour. Sending the email is only an enquiry, not an order confirmation.

The stated logistics are China-to-Germany with an **estimated** 4–6 week delivery window, subject to logistics confirmation; it is not a guaranteed delivery date. The legacy `/{locale}/cart` and `/{locale}/checkout` URLs redirect back to the FC1 configuration section. No online payment, order or inventory mutation is performed. Set the public email variable before the Next.js production build, then run checks and deploy; adding a runtime-only Cloud Run variable is not enough for a `NEXT_PUBLIC_` value already compiled into the client bundle.

## Historical preview-cart experiment — retired 2026-10-20



Source-change scope (not a delivery or live payment claim): the FC1 configurator can explicitly save its current model and proposed colour into a **single FC1 browser-session-only preview bag**, with a quantity selector limited to 1–9. A new localized `/{locale}/cart` page shows the genuine green reference bicycle, editable quantity and a prominent “price pending / no purchase” disclaimer. The existing `/{locale}/checkout` information page now shows a read-only order-review preview from the same session before the legal/risk notes. All copy is in DE/EN/ZH, with clear labels that no SKU, price, payment, stock reservation, real order, email notification or account persistence is involved. No card collection, checkout form, webhook or PSP SDK is introduced; payment remains disabled. The cart is not a canonical Commerce order: only `sessionStorage` records a product code, model code, colour proposal and quantity, with input validation and graceful storage failure. There is no backend order/inventory mutation. A future real cart must implement trusted product/price/tax/stock authority, authenticated order lifecycle and PSP verification per ADR 0005 rather than reinterpret this session preview as a valid order.

## First-party storefront preparation — 2026-10-20

ADR 0005 records the long-term direction for a first-party ALSVID B2C storefront with a third-party payment provider rather than a required Shopify subscription. The immediate business decision supersedes any earlier checkout-preview experiment: FC1 is promotional and accepts reservation enquiries by email only. The checkout and cart routes now redirect to FC1 configuration; no online order, stock reservation or payment is offered. The optional reservation recipient is a build-time `NEXT_PUBLIC_FC1_RESERVATION_EMAIL`; until it is configured, the email CTA remains disabled and explains that the address will be added later. Real commerce remains out of scope until seller, price/VAT/import treatment, PSP eligibility, settlement terms, consumer rights and regulatory review are resolved. See [ADR 0005](adr/0005-alsvid-owned-storefront-and-third-party-payments.md).

## Admin Ardot refinement sync — 2026-10-16

Local Admin now includes the confirmed Ardot product/dealer sample labels, dealer regional-share bars and aligned table headings, and the corrected 60%/40% example sales ranking. The stale cached sales table was removed. Sixteen existing independent protected routes are mapped to the newly separated Ardot pages in `sync-manifest.json`; no duplicate Admin homepage or external Figma-owned screens were added. GitHub's current empty-state workbench remains intact. This is UI fixture synchronization, not a live business integration or evidence of Production deployment. See [ADMIN_DESIGN_SYNC.md](ADMIN_DESIGN_SYNC.md) for source and reimport limits.


## Consumer homepage interactions — 2026-10-16

The original migration homepage now has manual scene tabs (mouse and arrow-key navigation), localized detail destinations for 20 platform/model/accessory/technology/brand concepts, clickable owner-service cards to existing guarded portal routes, and a selectable schematic folding preview. The shopping-bag control opens an accessible availability dialog explaining that Shopify commerce is not connected. Concept details do not assert unconfirmed specifications or complete commercial transactions. The user's follow-up adds Chinese `/zh` review pages alongside DE/EN; the shared switcher preserves the detail slug and remembers explicit choices. This is an implementation record; production completion requires exact-commit CI and live verification.


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
- Mail — Resend transactional delivery is wired for verification, password reset and FC1 reservation notification. Production now sends from the verified `alsvidbike.com` domain (`noreply@alsvidbike.com`) via the dedicated send-only secret `alsvidbike-mail-api-key` (Cloud Run `alsvid-api-00076-bgr`, 2026-10-21 cutover, end-to-end verified: code delivery and code login succeeded). The old `alsvid-mail-api-key` secret and `chaibenn.com` DNS are retained for rollback. See [RESEND_PRODUCTION_RECOVERY_2026-10-21.md](RESEND_PRODUCTION_RECOVERY_2026-10-21.md).
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

