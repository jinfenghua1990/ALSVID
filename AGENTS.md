# ALSVID Agent Contract

This repository is the clean-slate implementation authority for ALSVID.

## Read first

Before changing application behavior or architecture, read in this order:

For portal UI, design-tool ownership, Shopify or supplier work, also read `docs/DESIGN_TOOL_AND_PORTAL_BOUNDARY_2026-10-16.md`, `docs/PORTAL_DELIVERY_PLAN_2026-10-16.md` and ADR 0004. The first defines the target direction; the second records implementation evidence and delivery gates. Do not infer delivered capability from a design file, a role seed or a route alone.

1. `knowledge/README.md`
2. `knowledge/00-Company/Architecture.md`
3. `docs/AI_CONTEXT.md`
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
17. `docs/ENVIRONMENT_ARCHITECTURE.md`

For product, brand, website, dealer, customer-support, Shopify or AI work, also read the relevant files under `knowledge/`. The knowledge base is the shared ALSVID business context; this file and the `docs/` files remain authoritative for engineering constraints. For ALSVID WWW, My ALSVID or Dealer Portal web UI, also follow `docs/ALSVID_WEB_I18N_STANDARD.md`; Shopify-managed product, cart and checkout localization remains owned by Shopify.

Confirmed architecture decisions are not suggestions. Do not replace providers, redraw system boundaries, or add major infrastructure merely because a different stack appears fashionable. First identify the concrete problem, review the recorded rationale, and document the new decision.

## Current rebuild gate

Issue #20 is closed and the platform-core encapsulation gate is complete. Continue through the prioritized backlog (#123); do not restart the completed rebuild or enlarge legacy implementations. New capability must retain domain encapsulation and pass `pnpm arch:check`.

Production has been deployed. Never assume a target has no business data based on older pre-deployment notes; verify its state before a destructive operation.

## Non-negotiable business boundaries

- Do not copy runtime code, migrations, schemas or compatibility layers from ChaiBen-OS or the previous ALSVID repository.
- Historical repositories are requirement references only.
- ALSVID is for the bicycle/export/Europe business.
- 1688, JackYun/吉客云, domestic China settlement/tax workflows and CoffeeBear-specific behavior are out of scope.
- Shopify remains the external commerce/order authority for storefront transactions. ALSVID does not recreate a general-purpose OMS.
- Ardot owns Admin operations design; Figma owns final external-portal UI. Keep one confirmed design source per page and reuse existing implementation incrementally.
- Supplier self-service is a confirmed phased target (#185). Upstream supplier proposals/PO commitments belong to ALSVID Procurement; Shopify B2B is for businesses buying from ALSVID. Shared Partner identity does not merge Supplier/Dealer permissions.
- External portal APIs must enforce organization/ownership scope server-side. A role, shared Cookie or matching email is not a business entitlement; consult the portal delivery plan before exposing existing internal APIs.
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
- Development compute: the shared GitHub Codespace (cloud devcontainer) and disposable GitHub-hosted CI runners. Following the owner's 2026-10-18 decision, do not clone, install, build or run ALSVID development servers on home/company workstations.
- The only active cloud runtime is Production in `alsvid-prod`; the former shared Cloud Run Development/Test runtime in `alsvid-dev` is retired from the release architecture.
- Local/CI databases and storage are isolated and temporary. Do not assume Neon/R2 Test resources exist, and never use Production credentials for validation.
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

- Current environment names: Codespaces development, ephemeral CI, and Production. `ALSVID Development` refers only to the retired historical cloud runtime; `ALSVID Production` is the active cloud runtime.
- Following the owner-approved 2026-10-14 Production-only decision, reviewed PRs target `main`; `develop` is optional and does not deploy a separate cloud runtime.
- `CI` contains code verification and isolated Docker acceptance. Keep the `verify` and `containers` checks; they use disposable GitHub runners and no Production credentials.
- Production starts only after successful main CI (push or explicit workflow dispatch after a bot merge) for the exact commit. The release gate verifies both jobs and rejects obsolete automatic releases. Explicit rollback may select a previously successful Production release.
- Do not restore the retired Development Build, Development Deploy or promotion workflows without a new owner decision.
- Every meaningful change maps to an issue or coherent PR.
- Update `docs/CURRENT_STATE.md` only when behavior or architecture becomes real.
- Add tests for changed invariants.
- Do not add secrets, credentials or real customer data.
- Prefer one clean implementation over compatibility shims for code that has never been deployed.
- CI validates a software version/commit; it never promotes test data into Production.
- Production changes must remain reproducible from GitHub source and documented configuration.

## 多设备与多 AI 协作规则（2026-10-18）

- 开工先读取当前 main、相关开放 PR 和工作树状态；已有任务优先续接原分支/PR，禁止从过期聊天快照覆盖代码。
- 一项任务一个短期分支和 PR；不要直接推送 main。换电脑优先重开同一个 Codespace；独立 AI 工作区只通过已推送的提交、分支和 PR 交接。
- 修改前 fetch 最新远端；脏工作树先保留并确认归属，不得 reset --hard、清理未跟踪文件、覆盖他人修改或强推共享分支。发现同文件并行工作先在 PR 说明并协调。
- 提交前检查 diff、密钥与相关验证；推送前再次检查远端分支，处理冲突并复验。禁止为了过 CI 而弱化检查。
- 交接写清仓库、分支、基准/当前 SHA、PR、已修改文件、验证结果、未提交内容和下一步。未提交修改不是 GitHub 备份。
- AGENTS.md 只约束实际读取并遵循它的工具；权限、分支保护和 CI 才能提供服务器侧约束。不得宣称所有机器人会自动读取。
- 不提交生产凭据或真实业务数据；代码回滚不等于数据库、对象存储和运行数据恢复。

开发入口和恢复操作见 `docs/COLLABORATION.md`。按用户 2026-10-18 最新决定，后续开发与验证只使用 Codespaces / 云端 AI 工作区及临时 CI；禁止在家里或公司电脑重新克隆仓库、安装项目依赖、构建或启动 localhost 开发服务。无需执行代码的文档小改可通过 GitHub 分支与 PR 完成。没有可用云端执行入口时，报告缺少的连接，不自行回退本机；不新增共享 Cloud Run Test 环境。
