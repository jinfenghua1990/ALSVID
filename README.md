# ALSVID

> ALSVID 是自行车品牌的企业数字化平台。这个仓库是 ALSVID 的新实现权威源（implementation authority），不是 ChaiBen-OS 或旧 ALSVID 代码的迁移副本。

这份 README 同时服务于三类读者：

1. 业务负责人：快速看懂 ALSVID 是什么、为什么这样搭；
2. 开发人员：知道系统边界和当前技术选择；
3. AI / Codex：在修改代码前理解已经确认的决策，避免重新把项目带偏。

---

## 1. ALSVID 首先解决什么问题

Shopify 可以很好地解决电商交易，WMS 可以很好地解决仓库执行，但它们都不是“自行车从出生到售后”的长期业务主档。

ALSVID 的核心价值是把这些长期事实连接起来：

- 产品、车型、SKU 与工程/BOM；
- Vehicle / VIN / 车架号；
- 客户与车辆归属关系；
- 经销商与交付关系；
- 保修、维修、售后、配件补发；
- 与 Shopify、WMS、物流等外部系统之间必要的数据关联；
- Vehicle 360 / My ALSVID 客户与服务入口；
- 后续的通信、营销、AI 辅助和运营分析。

一句话：

> **订单只是车辆来源和业务凭证；Vehicle / VIN 才是 ALSVID 的核心长期资产。**

---

## 2. ALSVID 不是什么

ALSVID 明确不做以下事情：

- 不是 Shopify 替代品；
- 不是通用 OMS；
- 不是 WMS；
- 不是为了把所有 ERP/电商/仓储功能重新造一遍；
- 不复制 Shopify/WMS 的完整数据库。

这样做是为了避免重复建设、数据冲突和后期运维复杂度。

### 系统边界

| 系统 | 主要负责 | ALSVID 与它的关系 |
| --- | --- | --- |
| Shopify | 商城、商品、B2C 订单、支付、退款等交易事实 | ALSVID 获取与车辆/客户/售后相关的必要事实，不接管完整订单执行 |
| WMS | 收货、库存、拣货、包装、出库、仓库侧履约事实 | ALSVID 获取必要发货/物流事实；售后补发等场景可向 WMS 下发明确执行请求 |
| ALSVID | Vehicle/VIN、客户、经销商、保修、服务、维修、售后、车辆生命周期 | 作为品牌自己的长期业务主档和服务中枢 |

更详细边界见：[`docs/BUSINESS_BOUNDARY.md`](docs/BUSINESS_BOUNDARY.md)

---

## 3. 当前整体架构（已确认）

```text
                           GitHub
                    唯一代码 / 版本来源
                              |
                              v
                    Google Cloud Run
                      Production 运行
                              |
              +---------------+----------------+
              |                                |
              v                                v
       Neon PostgreSQL                  Cloudflare R2
        结构化业务数据                    图片/PDF/附件/媒体
              ^                                ^
              |                                |
      Neon Test resources               R2 Test resources
              ^                                ^
              +---------------+----------------+
                              |
                         M1 Mac + Docker
                       开发 / Test 计算

外部业务系统：
Shopify  <---- connectors/adapters ---->  ALSVID  <---- connectors/adapters ---->  WMS
```

### 当前主方案 / 备用方案

| 类别 | 当前主方案 | 备用 / 后续迁移方案 | 为什么这样定 |
| --- | --- | --- | --- |
| 代码源 | GitHub | 不设置第二代码权威源 | 保持版本和部署来源唯一 |
| 生产运行 | **Google Cloud Run** | **1. Railway  2. Apply.Build** | 大厂、容器原生、低运维、低流量可缩容；同时保持可迁移 |
| 数据库技术 | PostgreSQL | PostgreSQL 兼容迁移 | 开源成熟、关系数据适合 ALSVID、避免数据库锁死 |
| 数据库服务商 | **Neon PostgreSQL** | **Supabase PostgreSQL** | Neon 轻量、PostgreSQL 原生、分支适合 Test；Supabase 保留迁移能力 |
| 对象存储 | **Cloudflare R2** | 其他 S3-compatible provider | 文件与数据库分离，S3 兼容，便于未来迁移 |
| Test 计算 | **M1 + Docker** | 未来可增加 Cloud Run Test | 当前单人阶段不需要维护第二套云运行环境 |
| Test 数据库 | **Neon Test resources** | — | 测试真实 TLS/连接/分支/迁移行为，不用本地 Postgres 作为默认权威 Test |
| Test 对象存储 | **R2 Test resources** | 本地 MinIO 只做离线/特殊测试 | 避免 localhost、CORS、HTTPS、Presigned URL 与生产行为不一致 |
| 灾备 | **当前暂不建设完整 DR** | 未来按业务规模规划 | 现阶段避免过早增加复杂度；Q4 暂不承担 Production DR |

---

## 4. 为什么 Production 首选 Google Cloud Run

当前 ALSVID 主要是内部运营 + 经销商/售后 + 客户 Vehicle/My ALSVID 访问，不是秒级高并发交易平台。

Cloud Run 当前更适合，因为：

- Google 大型云服务商，长期稳定性和生态更有信心；
- 直接运行 Docker/container；
- 低流量可以缩容，减少空闲成本；
- 不需要自己维护 VPS 操作系统、防火墙、证书和进程；
- 可以从 GitHub/CI 构建部署；
- 没有自有域名时也可先使用 Cloud Run 提供的 HTTPS 地址；
- 后续需要 IAM、Secret Manager、日志等能力时可以逐步增加。

### 为什么不是永久绑定 Cloud Run

ALSVID 必须保持：

- Docker 化；
- 环境变量/Secret 配置解耦；
- 业务 Domain 不依赖 Google 专属 API；
- 数据库保持 PostgreSQL 标准；
- 对象存储保持 S3-compatible 抽象。

因此 Cloud Run 是**当前首选**，不是永久锁死。

备用顺序已经确认：

1. Railway
2. Apply.Build

详细原因见：[`docs/RUNTIME_DECISION.md`](docs/RUNTIME_DECISION.md)

---

## 5. 为什么数据库使用 Neon PostgreSQL

数据库技术标准是 PostgreSQL，而不是“Neon 专属数据库”。

选择 Neon 作为当前主服务商，主要因为：

- PostgreSQL 原生；
- 托管/Serverless，减少数据库服务器维护；
- 数据分支（branching）适合 Test / migration / reset；
- 对当前 ALSVID 规模简单、成本友好；
- 不需要把 ALSVID 绑定到额外后端平台能力。

### 为什么 Supabase 不是当前主方案

Supabase 也是优秀的 PostgreSQL 平台，而且管理界面、Auth/Storage/Realtime 等整套能力更丰富。

但 ALSVID 已经有自己的：

- Web；
- API；
- Identity/权限；
- R2 文件存储；
- Domain 业务层。

所以目前不需要为了附加能力增加平台耦合。

结论：

- **Primary: Neon PostgreSQL**
- **Migration alternative: Supabase PostgreSQL**

如果以后 Neon 在成本、运维、区域或功能方面不再合适，可以迁移 Supabase，而不是重写 ALSVID。

详细原因见：[`docs/DATABASE_DECISION.md`](docs/DATABASE_DECISION.md)

---

## 6. 为什么对象存储使用 Cloudflare R2

图片、PDF、售后照片、维修附件、说明书、视频等二进制文件不应该直接塞进 PostgreSQL。

正确分工：

```text
PostgreSQL
= 文件的业务关系、metadata、object key、权限状态

R2
= 真正的文件 bytes
```

选择 R2 是因为：

- S3-compatible；
- 适合 Presigned URL 和受控文件访问；
- 文件与数据库解耦；
- 当前成本入口低；
- 后续可以利用 Cloudflare 全球网络；
- 如果未来更换对象存储，业务 Domain 不需要推倒重写。

### 为什么 Test 不默认使用本地 MinIO

本地 MinIO 经常会产生与 Production 无关的“伪问题”或掩盖真实问题：

- `localhost` URL；
- HTTPS 行为不同；
- CORS 不同；
- Presigned URL 不同；
- Shopify/WMS/手机无法访问本地地址；
- 本地权限配置可能与 R2 不一致。

所以当前正常 Test 使用独立 R2 Test 资源。

详细原因见：[`docs/STORAGE_DECISION.md`](docs/STORAGE_DECISION.md)

---

## 7. Test / Production 怎么分

当前阶段**不维护两套 Cloud Run**。

### Development / Test

```text
M1 Mac
  + Docker
      |
      +--> Neon Test
      +--> R2 Test
```

### Production

```text
Google Cloud Run
      |
      +--> Neon Production
      +--> R2 Production
```

### 为什么这样做

当前主要是单人开发，直接维护 Cloud Run Test + Cloud Run Prod 会增加：

- secrets；
- 云配置；
- 部署流程；
- 账单/资源管理；
- 排查复杂度。

M1 用 Docker 可以承担当前的软件验收；但数据库和对象存储继续使用云端 Test 资源，保持关键外部行为接近 Production。

### 什么叫“Test 通过后上线”

不是把 Test 数据库切成 Production。

正确流程：

1. M1 开发；
2. Docker 验收；
3. 连接 Neon Test / R2 Test 测试；
4. 确认一个具体 Git commit/version；
5. 将**同一个版本**部署到 Cloud Run Production；
6. Production 只连接 Neon Prod / R2 Prod / Production secrets。

Test 数据和 Test 文件不会变成 Production 正式数据。

以后出现多人协作、Cloud Run 专属问题或真实负载测试需求，再增加 Cloud Run Test。

详细原因见：[`docs/ENVIRONMENT_STRATEGY.md`](docs/ENVIRONMENT_STRATEGY.md)

---

## 8. Shopify / WMS 数据怎么进入 ALSVID

当前不追求永久实时同步。

默认方案：

- 每天至少一次同步/校准；
- 平时客户/员工页面读取 ALSVID 缓存的最近成功数据；
- My ALSVID / 售后页面提供 **“更新最新状态”** 按钮；
- 用户手动刷新时，再去 Shopify/WMS 获取这个页面需要的最新事实；
- 页面显示“最后更新时间”和“预计刷新时间”；
- 手动刷新设置短时间 cooldown，避免连续重复请求；
- 未来真的出现秒级业务需求，再增加 Webhook/实时机制。

ALSVID 保存的是 Vehicle 360、客户服务、售后所需要的外部事实，而不是完整克隆 Shopify/WMS 数据库。

---

## 9. Q4 当前怎么定位

Q4 **当前不承担正式 Production 运行，也不建设完整容灾/灾备体系**。

现阶段不投入：

- 多地域热备；
- 自动灾难切换；
- 复杂离线备份体系；
- Q4 作为生产备机。

这不是说“永远不备份”，而是明确把完整 Backup/DR 放到后续业务规模真正需要时再设计。

---

## 10. 当前成本和复杂度原则

ALSVID 当前阶段优先级：

1. 稳定；
2. 简单；
3. 低运维；
4. 正常全球访问；
5. 尽量利用免费/低成本额度；
6. 保持可迁移，不为了免费把系统锁在小平台。

允许为大厂服务绑定支付方式，但目标是当前低使用量阶段尽量保持非常低的实际运行费用。

---

## 11. Clean-slate rules

- No legacy runtime code is copied into this repository.
- No legacy database migration chain is inherited.
- No backward compatibility with ChaiBen-OS or the previous ALSVID API is required unless a future ADR explicitly approves it.
- Historical repositories may be consulted for business requirements only.
- 1688, JackYun/吉客云, domestic China sales/tax/accounting workflows, and CoffeeBear business logic do not belong here.
- Shopify/WMS are external systems; ALSVID does not recreate a general-purpose OMS.

---

## 12. Product / domain direction

ALSVID is organized by durable business domains rather than by screens:

- Identity & Access
- Partners
- Product
- Engineering
- Procurement
- Production
- Inventory
- Warehouse
- Logistics & Export
- Commerce
- Finance
- Vehicle
- Dealer
- Customer
- Service & Warranty
- Communications
- Marketing
- Assets
- Integrations
- Audit & Compliance

The system begins as a modular monolith with explicit domain boundaries and contracts. This keeps deployment simple now while preserving a future path to split selected workloads when scale or organizational needs justify it.

---

## 13. Technical baseline

- TypeScript end-to-end
- Next.js + React for web applications
- NestJS for application/API services
- PostgreSQL as the authoritative relational database contract
- Cloudflare R2 / S3-compatible object storage for binary assets
- Background worker for asynchronous jobs, integrations, AI-assisted processing, and long-running workflows
- API/event contracts shared through versioned packages
- Docker/container-based Production delivery

---

## 14. Repository layout

```text
apps/
  web/        # Internal Admin, Dealer Portal, My ALSVID web surfaces
  api/        # NestJS modular-monolith API
  worker/     # async jobs, integrations, workflow execution
packages/
  database/   # PostgreSQL connection and migration runner
  contracts/  # API/event schemas and shared identifiers
  config/     # shared configuration primitives
  ui/         # ALSVID design system
  testing/    # test helpers and fixtures
domains/
  identity/
  audit/
  partners/
  product/
  engineering/
  assets/
infra/         # local and production infrastructure definitions
docs/          # architecture, boundaries, decisions, ownership and operations
```

---

## 15. AI / 新开发者必须先读

在修改 ALSVID 架构或业务边界前，至少先读：

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md)
3. [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md)
4. [`docs/BUSINESS_BOUNDARY.md`](docs/BUSINESS_BOUNDARY.md)
5. [`docs/DATABASE_DECISION.md`](docs/DATABASE_DECISION.md)
6. [`docs/RUNTIME_DECISION.md`](docs/RUNTIME_DECISION.md)
7. [`docs/STORAGE_DECISION.md`](docs/STORAGE_DECISION.md)
8. [`docs/ENVIRONMENT_STRATEGY.md`](docs/ENVIRONMENT_STRATEGY.md)
9. [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
10. `docs/CURRENT_STATE.md` / `docs/ARCHITECTURE.md` / `docs/DATA_OWNERSHIP.md` / `docs/BUSINESS_FLOWS.md`

### 重要规则

> 不要因为换了 AI、换了开发人员、出现了一个新云平台，就自动推翻已经确认的架构。

任何重大变更都必须先回答：

- 当前方案解决了什么问题？
- 新方案具体解决了哪个真实问题？
- 会不会破坏 ALSVID 的业务边界？
- 能不能回滚？
- 是否真的值得增加复杂度？

---

## 16. Local bootstrap

Repository tooling may still provide local bootstrap helpers for development. Production-bound acceptance follows [`docs/ENVIRONMENT_STRATEGY.md`](docs/ENVIRONMENT_STRATEGY.md): Docker + isolated managed Test data resources.

Typical local setup starts with:

```bash
pnpm install
pnpm dev
```

Use repository scripts/infra definitions documented in the current branch rather than copying credentials into source control.

---

## 17. 最后一句

ALSVID 的目标不是“把所有系统都自己做一遍”，而是：

> **把品牌最重要、最长期的 Vehicle / VIN / Customer / Dealer / Warranty / Service 数据掌握在自己手里，同时让 Shopify、WMS、云数据库、对象存储和运行平台都保持可替换。**
