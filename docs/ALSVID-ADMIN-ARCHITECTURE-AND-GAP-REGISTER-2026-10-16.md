# ALSVID Admin 工作台架构与页面缺口台账

- 文档状态：核对基线 / 待逐项关闭
- 核对日期：2026-10-16
- 适用范围：ALSVID Admin 工作台、十个后台业务模块、与消费者端的系统边界、Ardot 页面交付
- 目的：把已确认的业务架构、当前设计/代码状态、未完成页面与交付顺序放在一个可持续更新的 GitHub 文档中。

> 本文是架构与页面缺口核对，不代表所有列出的能力已经开发、已接入真实数据或已上线。产品需求被收录、Ardot 有画板、应用有演示路由，三者分别记录，不互相代替。

## 1. 已确认的产品与系统边界

ALSVID 的消费者服务和内部运营使用不同入口、不同导航、不同权限。它们可以通过 ALSVID API、领域服务和经过筛选的业务事实协作，但消费者端不进入 Admin 工作台，也不复用 Admin 页面画板。

```text
ALSVID
├── ALSVID Official
│   ├── 品牌官网与商城浏览
│   └── Shopify：商品交易、结账、支付和商业订单权威
├── My ALSVID
│   └── 登录后的车主车辆、保修、服务、维修、文件与售后申请
├── ALSVID Dealer Portal
│   └── 经销商自己的采购、库存、交付与售后视角
└── ALSVID Admin
    └── 内部员工的工作台、产品、订单事实、生产、库存、渠道、售后与设置
```

### 页面边界

- ALSVID Official / 商城首页面向公众和购买意向用户，展示品牌、车型、配件、服务入口及经销商合作入口。
- My ALSVID 面向登录车主，数据按当前用户和车辆归属授权。
- Dealer Portal 面向经销商及其员工，使用经销商范围的数据权限。
- Admin 面向内部员工，依角色和数据范围授权。
- 页面之间不能因共用品牌或业务对象而混用导航、工作台卡片或画板。交互如“进入 My ALSVID”“经销商登录”是面向用户的门户入口，不得指向 Admin 页面。

### 不替代外部系统

- Shopify 负责消费者商品交易、结账、支付、退款和原始商业订单。
- WMS 负责仓储执行、拣货、打包、出库和仓库侧履约。
- ALSVID 仅保留车辆生命周期、客户/经销商服务、保修、维修、售后和对账所需的规范化事实；不复制 Shopify/WMS 全库，也不扩展成通用 OMS/WMS。
- PostgreSQL 是 ALSVID 结构化业务事实权威；R2/S3 兼容存储保存二进制对象。

## 2. Admin 工作台架构

### 工作台与驾驶舱

**工作台（Admin 首页）与经营驾驶舱是同一个页面职责。** 工作台提供跨模块经营概览、待办、异常与快捷入口。驾驶舱是该页面的内容形态，不是另一个后台首页、模块或需要重复维护的独立页面。

Admin 应保留一个规范首页：`/admin` / Ardot 的 `工作台｜白天版`。如果保留“经营驾驶舱”作为视觉或内容稿，应并入该工作台画板；独立重复的首页画板应收口，避免两个首页并存。

### 固定一级导航

```text
工作台 → 产品 → 订单 → 生产 → 库存 → 经销商
        → 客户 → 售后 → 供应链 → 数据 → 设置
```

- 工作台首页全宽展示，不出现模块左侧二级菜单。
- 进入业务模块后，顶部保留一级导航，左侧只显示当前模块的二级导航，右侧为页面工作区。
- 移动端将导航收纳为可访问菜单；当前一级模块和当前二级页面需有清晰状态。
- 不把消费者商城式 Hero、购物车和消费者个人导航放入 Admin。

### 产品与车辆主链路

```text
Platform
  → Model
    → Variant / Configuration
      → SKU
        → Released BOM / Build Specification
          → Production Plan / Work Order
            → QC / Vehicle Birth
              → VIN + Frame Number
                → Inventory / Reservation
                  → Shopify Order / Dealer Order reference
                    → Shipment / Delivery facts
                      → Ownership history
                        → Warranty / Service / Repair / After-sales
```

关键不变量：

- Product 不等于 Vehicle；SKU 不等于 VIN。
- 每台实物自行车对应唯一 Vehicle；车辆出生时写入 VIN / Frame Number，车辆身份不可复用。
- 订单和支付权威仍在 Shopify 或相应外部商务渠道；ALSVID 保留履约和车辆关联所需事实。
- 库存数量由不可变库存移动/预留事实推导；WMS 负责实际仓储动作。
- 车辆转让追加所有权历史，不抹除先前车主区间。

### 领域与写入权威

```text
Identity / Partners
├── 身份、员工、角色、权限、会话
└── 法律主体/自然人/企业主数据

Product / Engineering / Assets
├── 平台、型号、配置、SKU
├── BOM、零件、工程版本
└── 文件元数据 / 文件对象关系

Commerce / Procurement / Production / Vehicle
├── 外部渠道映射与规范化订单事实
├── 采购承诺
├── 工单、装配、质检
└── Vehicle、VIN、生产出生和所有权历史

Inventory / Warehouse / Logistics
├── 库存移动、预留
├── WMS 仓库执行
└── 发运、物流与交付事实

Dealer / Customer / Service
├── 经销商策略与渠道关系
├── 客户角色/客户视图
└── Warranty、服务工单、维修与售后

Finance / Communication / Marketing / Integrations / Audit
└── 财务事实、通信、营销同意、同步控制和审计证据
```

一个业务事实只有一个写入权威。跨领域写入通过公开应用契约或事件完成，不直接修改其他领域的数据表。Admin 是这些领域能力的内部操作视图，不另造一套平行业务数据库。

## 3. GitHub、Ardot、Figma 与应用实现的职责

| 交付面 | 权威内容 | 验收方式 |
| --- | --- | --- |
| GitHub 仓库 | 架构、需求、页面/路由清单、实现代码、验证记录 | PR、CI、代码审查 |
| Ardot（内部运营设计） | Admin 工作台、经销商采购流程 | 按独立画板检查页面、流程、状态和权限边界 |
| Figma（消费者体验设计） | ALSVID Official 商城首页、My ALSVID 我的车库 | 按消费者旅程检查；与 Admin 画板隔离 |
| 本地 / CI 应用 | 对应 GitHub commit 的可运行实现或 fixture renderer | 类型检查、架构检查、测试、浏览器验收 |
| Shopify / WMS 等外部系统 | 各自的交易或执行权威事实 | 集成状态、对账与外部系统验收 |

Ardot 与 Figma 分别承担不同设计范围；GitHub 是实现与架构交付面。Ardot 工作台中的“官方首页”“我的车库”仅是跨应用入口，不表示消费者页面归 Ardot 设计。画板导入或静态演示不代表真实 API、权限、审批或交易已经接通。应用实现必须遵守 `AGENTS.md`、`docs/ALSVID_ADMIN_IA.md`、`docs/BUSINESS_BOUNDARY.md`、`docs/DATA_OWNERSHIP.md` 和现有 ADR。

## 4. 当前交付基线

### 已有的后台基线

- 仓库已有 Admin 固定一级导航、共享 AppShell 和工作台 `/admin`。
- `docs/ADMIN_DESIGN_SYNC.md` 记录了 85 个 Admin fixture 页面/状态视图以及独立受保护路由。页面数据是明确标注的演示 fixture，编辑不会保存业务记录，也不会执行审批、生产、库存移动、发货、消息、集成或权限变更。
- 仓库已有产品、采购、生产/QC/Vehicle Birth、库存/仓储、物流、经销商/外部 Commerce 同步基础，以及 Finance 等领域基础。实际页面覆盖不能推导出每个领域都已具备端到端真实业务流程。
- 十模块优化需求文档的“10/10 已收录”表示需求整理完成，不代表模块实现、真实数据接入或页面缺口均已关闭。

### 两套设计工具的范围（按当前约定）

| 工具 | 负责的设计模块 | 当前核对结果 |
| --- | --- | --- |
| Ardot | ALSVID Admin 全部内部运营设计/原型 | 当前 Ardot 同步资产用于 Admin 工作台及十个内部业务模块。经销商采购若作为流程原型可在 Ardot 讨论，但不作为 Dealer Portal 的最终视觉设计源。 |
| Figma | 所有对外门户的最终 UI：Official / Shop、My ALSVID、Dealer Portal、未来 Supplier Portal | My ALSVID 车库已有 Figma 记录；Official 首页及 Dealer/Supplier 的最终设计文件仍需逐项登记和验收，不能把文件存在写成页面已完成。 |

> **2026-10-16 更新：** Ardot 的最终设计范围收口为 ALSVID Admin 内部运营系统；Figma 的最终设计范围扩展为所有对外门户（Official / Shop、My ALSVID、Dealer Portal、未来 Supplier Portal）。Ardot 中的“官方首页 / 我的车库 / 经销商入口”只保留跨应用跳转，不代表这些页面归 Ardot 设计。旧消费者副本在 Figma 页面逐项确认前不得删除；先区分重复设计资产、代码依赖和历史 fixture。

> 核对限制：Ardot 文件检索到工作台及“官方首页 / 经销商采购 / 我的车库”入口文字；Figma MCP 本轮因 Starter 计划调用上限无法读取画板元数据。车库文件链接来自现有 Notion 架构页；首页 Figma 链接仍待确认，因此目前只能确认目标归属，不能宣称两个 Figma 画板均已逐层验收。

## 5. 工作台与十个后台业务模块的页面缺口

下表包含工作台，以及产品、订单、生产、库存、经销商、客户/车主、售后、供应链、数据、设置十个后台业务模块。状态按已核对的需求文档与现有 Ardot 页面清单整理。**“有页面”只表示存在设计/演示画面，不表示已连接真实领域 API。**

| 模块 | 已有页面基线 | 尚需补齐或确认的页面/能力 | 优先级 |
| --- | --- | --- | --- |
| 工作台 | 工作台总览、经营 KPI、待办/异常入口、模块入口 | 合并重复“经营驾驶舱”；统一指标口径、数据时效、权限过滤、空/错误状态；不显示无来源的实时数值 | P0 |
| 产品 | 产品总览、型号追踪详情、新建型号 | 平台管理；型号/配置/Variant/SKU；BOM 与零件库；工程文件/3D/版本控制；开发/量产/停产/归档生命周期；版本发布规则 | P1 |
| 订单 | 订单总览、订单详情、新建订单 | 按 B2C、Dealer B2B、配件/售后订单分型；订单事实与 Shopify/外部渠道映射；库存预留/生产需求；发运、物流追踪、交付与 VIN 绑定的完整可见链路；不能让 Admin 重建 checkout/通用 OMS | P1 |
| 生产 | 生产总览、计划创建、装配/异常、VIN 管理、车辆档案 | 排产与产线视图；工单列表/工序详情/进度；来料、装配、出厂质检结果；BOM/批次/零件追溯；VIN 生成/绑定规则；待入库交接 | P1 |
| 库存 | 库存总览/详情、调拨、预警、经销商库存 | 原材料/半成品/零件/整车的分层视图；仓库和库位；逐 VIN 状态与预留来源；移动台账、盘点/差异；周转与呆滞分析；区分 ALSVID 台账与 WMS 执行 | P1 |
| 经销商 | 经销商总览/详情、区域授权、B2B 采购流程 | 区域/门店层级；采购预测；总部与经销商库存/终端销售的口径；目标达成；服务能力、认证培训、评分和合作协议；Dealer Portal 的权限边界 | P2 |
| 客户 / 车主 | 客户总览、企业客户列表/详情、车主详情、购买服务履历、车辆绑定 | 普通客户/认证车主/企业与车队关系模型；客户来源；一客多车与一车多所有权历史；服务/保修事实权限；客户请求、导出/删除和隐私审计流程 | P1 |
| 售后 | 售后总览、保修管理、配件申请/更换、服务网络/分派 | 售后/维修工单列表与详情；车主预约和状态时间线；响应 SLA；维修项目、换件与费用记录；服务报告；与 WMS 替换件履约的边界；保修政策按地区生效与待核验状态 | P1 |
| 供应链 | 供应链总览、采购流程、供应商详情/评分、零件供应关系 | 采购需求预测/补货建议；PO/收货/来料质检完整状态；供货能力与交期风险；替代料/多源供应；供应商成本与质量趋势；与 BOM 和生产短缺联动 | P2 |
| 数据 | 经营看板、销售/生产/库存/供应链/渠道/售后分析、报表导出 | 统一指标定义、时间范围/地区/渠道过滤；从 KPI 下钻到可授权的业务记录；数据更新时间和缺失状态；成本/毛利与财务口径；导出权限与审计 | P2 |
| 设置 | 设置总览、组织/员工、角色与数据权限、登录安全、审计、第三方集成、消息、API | 仓库/产线/库位、区域/渠道、业务字典与编号规则、保修政策、通知模板等主数据配置；权限矩阵细到领域/地区/字段/操作；密钥只显示配置状态不回显 | P2 |

### 所有模块共通的未完成项

- 页面状态：加载、空、无权限、过期缓存、部分同步失败、重试和最后成功同步时间。
- 记录关联：业务 ID 可跨页面追踪，但严格按域权限校验；VIN 是车辆主索引之一，不是绕过归属验证的凭证。
- 变更证据：审批、库存、生产、交付、所有权、保修和权限变更需要操作者、时间、原因、来源和不可变审计记录。
- 示例数据：所有 fixture 清楚标记为演示数据，不呈现为真实客户、库存、订单、响应承诺或销量。
- 多端规则：桌面表格在窄屏退化为可读卡片/分段视图；键盘焦点、对比度、语义标签和触控目标需验收。
- 页面映射：Ardot 画板、`apps/web/app/_design/sync-manifest.json`、路由、所属领域、真实 API 状态保持一一可追溯。

## 6. 车主与商城设计的独立交付

### ALSVID Official / 商城

- 消费者首页的设计源为 Figma；当前 Figma 文件链接待确认。
- Ardot 文件中的“官方首页”只作为跨应用入口，不作为消费者首页设计源。
- 页面围绕消费者浏览与购买意图；真实商品、价格、库存、购物车、支付、结账、配送和 My ALSVID 入口由官网/Shopify 体系决定。
- 不把 Admin KPI、待办、表格、内部侧栏或工作台链接引入商城画板。

### My ALSVID

```text
/my
/my/vehicles
/my/vehicles/register
/my/vehicles/[vehicleId]
/my/vehicles/[vehicleId]/warranty
/my/vehicles/[vehicleId]/service
/my/vehicles/[vehicleId]/repairs
/my/vehicles/[vehicleId]/documents
/my/vehicles/[vehicleId]/accessories
/my/service/new
/my/account
```

- 核心是车主已验证的车辆资产及其保修、服务、维修、资料、配件和售后生命周期，不是 CRM 或会员营销后台。
- VIN/车架号只识别车辆；服务端还必须核验登录身份与订单/交付/审核证据建立的车辆归属。搜索到 VIN 不等于取得访问权限。
- 未确认的保修条款显示“待核验”；不得伪造覆盖范围、剩余期限或响应 SLA。
- My ALSVID 页面独立设计和授权，与 Admin 通过 Vehicle/Customer/Service 等 API/领域事实协作；不直接链接到内部工作台画板。
- 当前代码仍有 fixture 业务数据；生产级车辆归属、保修和售后 API 需按 `docs/MY_ALSVID_OWNER_ARCHITECTURE.md` 验收。

## 7. 优先级与关闭顺序

### P0 — 先统一交付结构

1. Ardot 仅保留 ALSVID Admin 内部运营设计；经销商采购可以作为 Admin 内部流程原型，但 Dealer Portal 最终 UI 不归 Ardot。
2. Figma 负责 Official / Shop、My ALSVID、Dealer Portal，以及未来 Supplier Portal 的最终 UI；确认各文件链接和页面完整性。
3. 逐项盘点现有设计资产，区分 Ardot/Figma 重复稿、代码复用和历史 fixture；确认目标设计完整后再归档旧副本，不直接删除。
4. 在 Admin IA 和各 Portal 架构文档中标注设计工具、路由、角色、数据源和实现状态。
5. Supplier Portal 作为未来独立外部门户预留；上游供应商自助履约不通过 Shopify 冒充 Supplier Portal。
6. 保持 `/admin` 登录与 Admin 权限边界；消费者和外部 Portal 不暴露内部工作台。

### P1 — 先闭合产品到售后主链路

1. 补产品平台、配置/SKU、BOM/工程版本与发布状态。
2. 闭合生产计划 → 工单 → 质检 → VIN → 入库的状态和记录追踪。
3. 明确 Shopify 订单映射、库存预留、生产需求、WMS 发运/交付与 VIN/车主关联。
4. 补库存逐 VIN 状态、物料/BOM 关联和库存移动证据。
5. 补客户/车主归属校验、保修核验与售后工单状态。

### P2 — 完善运营与治理

1. 经销商区域/门店、销售表现、库存、服务能力与采购预测。
2. 供应商交期/来料质量/替代来源与生产短缺联动。
3. 数据中心指标口径、下钻权限、更新时间、财务与成本定义。
4. 设置中心主数据、策略、权限矩阵及审计规则。
5. 对每个模块补齐错误、空、无权限和部分同步状态及移动端验收。

### 开发约束

- 仓库当前状态文档记录 Issue #20 预部署封装门禁已完成；新能力仍必须符合 `AGENTS.md` 中模块化单体、领域公开 Facade、权限、领域写入权威和 CI 约束。
- 这份缺口台账不授权建立新基础设施或复制 Shopify/WMS。每项实现需要具体 Issue/PR、领域归属、写入权威和验收标准。
- 只更新该文档的状态或关闭项，不把设计期规划写成已实现事实。业务行为变化后才更新 `docs/CURRENT_STATE.md`。

## 8. 推荐验收标准

每个 Admin 页面进入“完成”前，至少能回答：

1. 谁使用，所属哪个模块，路由/Ardot 页面是否唯一？
2. 该页面读取和写入哪个领域事实，权威数据来自哪里？
3. 是否尊重 Shopify、WMS、Dealer Portal、My ALSVID 的边界？
4. 状态能否解释业务下一步，是否区分订单、生产、库存、物流、交付状态？
5. 是否显示空数据、同步失败、最后更新时间、无权限和待核验？
6. 关键动作是否有权限校验、审计记录、幂等与错误恢复？
7. 是否有桌面/移动端、键盘、屏幕阅读器和高对比度验收？
8. 页面是否由真实 API 驱动？若否，是否明确标为 fixture 并禁用有副作用的动作？

## 8.1 2026-10-16 新增：Supplier Portal 与 Shopify 边界

Supplier Portal 是未来第五个外部业务门户预留，不改变当前核心四项目定义。它面向 ALSVID 上游供应商，目标是让供应商自助完成采购订单确认、交期、生产进度、发货通知、文件/发票与对账等履约协同。

长期链路：

```text
ALSVID Admin
  → Procurement / PO
  → Supplier Portal
  → Supplier confirms quantity / delivery
  → Production progress
  → Shipment notice
  → Documents / invoice
  → ALSVID receiving / QC / inventory
```

Shopify 仍负责 B2C/B2B 商业交易。如果某供应商企业同时也是 ALSVID 的 B2B 买家，则其“Supplier Relationship”和“B2B Buyer Relationship”分开建模、授权和记账；向 ALSVID 采购的商业订单可以使用 Shopify B2B，不应因此把上游供应商履约功能塞进 Shopify。

## 8.2 2026-10-16 新增：下一轮代码检查重点

- Dealer Portal 当前代码存在复用 Admin 样式的情况；这是实现层现状，不应被解释成设计归属。下一轮应检查并逐步改为 Figma 对外门户视觉。
- Supplier 当前主要是 Admin 的供应链/采购能力；下一轮应确认数据模型和权限可以支持未来 Supplier Portal，而不是直接复制 Admin 页面。
- 不因设计工具归属调整而删除现有代码；先确认路由、组件、fixture 和业务 API 依赖，再做迁移/重构。
- 所有“已完成”状态必须区分设计完成、代码完成、CI 通过、部署完成和业务验收。

## 9. 相关权威文档

- [`AGENTS.md`](../AGENTS.md) — 工程、架构和交付规则
- [`ALSVID_ADMIN_IA.md`](ALSVID_ADMIN_IA.md) — Admin 导航和页面信息架构
- [`ALSVID-Admin-Optimization-Requirements-2026-10-14.md`](ALSVID-Admin-Optimization-Requirements-2026-10-14.md) — 十模块原始优化建议
- [`ALSVID-Admin-Architecture.md`](ALSVID-Admin-Architecture.md) — Admin 产品和模块定位
- [`ADMIN_DESIGN_SYNC.md`](ADMIN_DESIGN_SYNC.md) — Ardot 到 Admin fixture renderer 的同步记录
- [`BUSINESS_BOUNDARY.md`](BUSINESS_BOUNDARY.md) — 外部系统责任边界
- [`DATA_OWNERSHIP.md`](DATA_OWNERSHIP.md) — 领域事实写入权威
- [`MY_ALSVID_OWNER_ARCHITECTURE.md`](MY_ALSVID_OWNER_ARCHITECTURE.md) — 车主端产品、路由和权限规范
- [`ALSVID官网商城架构规划.md`](ALSVID官网商城架构规划.md) — Official、Shopify 与其他门户边界
- [`DOMAIN_STRUCTURE.md`](DOMAIN_STRUCTURE.md) — 模块化单体目录与领域边界

