# ALSVID 统一 API 与分门户身份架构

> 新的生产门户链接和认证基准统一使用 `*.alsvid.com`；旧 `chaibenn.com` 是迁移/历史域名。DNS、TLS、Cloud Run 绑定、生产环境变量和真实认证流程仍须单独验收，不能把代码目标当成已上线证据。

> 2026-10-16 核对修订：本文区分目标与现有代码。逐项状态与缺口见 [门户实施台账](PORTAL_DELIVERY_PLAN_2026-10-16.md)，设计和供应商目标见 [ADR 0004](adr/0004-portal-experience-commerce-and-supplier.md)。未来域名切换仍需迁移配置、回调与 Cookie，不是自动无感切换的承诺。

## 固定架构

ALSVID 使用：

- 一个统一的 ALSVID API 后端
- 一个 ALSVID 身份/授权中心；My 和 Shopify 买家采用经验证的 Shopify 客户身份来源
- 一个环境内的 PostgreSQL 数据中心
- 一个环境内的 R2 对象存储
- 四个核心独立前端门户；Supplier Portal 作为未来第五个外部业务门户预留

四个核心前端分别是：

- ALSVID Official：官网与 Shopify 商城前端
- ALSVID Admin：公司内部运营后台
- ALSVID Dealer Portal：经销商 / B2B 门户
- My ALSVID：车主与车辆生命周期中心

四个核心项目是独立产品/体验/权限边界，当前可以继续在同一 `apps/web` 中分阶段实现。Supplier Portal 是已确认的后续目标，也保持独立入口和权限。前端可按实际需要拆分部署，复用授权 API 和领域；不复制数据库，不把 Shopify 外部身份/交易数据全量变成 ALSVID 自有认证或业务主数据。

Admin 顶部右侧的应用切换器显示“官网、车主中心、经销商平台”，在新标签打开目标应用并保留 Admin 状态。项目名和入口显示名按 [APP_ENTRY_ARCHITECTURE.md](APP_ENTRY_ARCHITECTURE.md) 与 [SYSTEM_NAMING.md](SYSTEM_NAMING.md) 执行。

## 当前运行环境

生产环境：

- Production API
- Production PostgreSQL
- Production R2
- 生产身份会话

开发在本地，CI 使用临时容器和 PostgreSQL。共享云端 Development/Test 已退役，`*.dev.chaibenn.com` 及开发父域 Cookie 代码属于历史兼容/命名记录，不能据此创建云环境。任何测试身份、数据库和凭据均与 Production 隔离。

## 身份来源、联登目标与当前 Cookie

- Admin：ALSVID 员工身份、内部邮箱/邀请策略与授权。
- Dealer：现有 ALSVID 业务登录保留，后续补组织成员范围。Shopify 买货使用经验证的 Customer/Company/Location 上下文；两者须显式绑定，不按邮箱自动联通。
- My：目标是 Shopify Customer Account 验证后建立最小 ALSVID 映射及独立会话。现有可配置登录链接不代表 OAuth 回调、令牌交换和归属查询已经完成。
- Supplier：面向外部企业成员的邀请、组织范围和采购能力，不授予员工身份。当前 Supplier 角色种子存在，不代表门户可登录。

现有 Web Cookie 代码对 Admin/Dealer/Supplier/Service 名称支持父域 `alsvid_session`，My 使用独立名称 `alsvid_my_session` 和 Host-only 设置。**父域 Cookie 仍会发送到 My 等匹配子域；独立名称不能实现对子域的排除。** 这只是当前兼容策略，不能宣称外部企业门户已经完成隔离。新外部门户上线前须评审可信子域、按门户会话、注销与协议式身份交换；未有迁移任务前不擅自更换身份提供商或重写现有认证。

共享登录不共享权限。每次 API 读写需验证会话、组织/车辆范围和业务能力；UI 隐藏、`/v1/auth/me` 的角色或 `system_admin` 入口放行，均不能替代外部资源归属校验。员工代看应是获授权、可审计的支持视图。

当前 Admin 唯一正式入口为 `https://admin.alsvid.com`，API 用 `AUTH_BASE_URL` 生成其密码重置链接。Web 的默认 `run.app` URL 已在生产部署配置关闭（404 是预期），Proxy 重定向仅是默认 URL 可达时的兼容代码，不能当作现行正式入口。API 自身技术 URL 仍可用于受控服务通信，不因 Web 关闭而一并禁用。

其他门户启用时，各自 OAuth 回调、邀请/登录返回地址必须通过允许列表配置；不得从任意请求 Host 生成认证 URL，也不得把 My 的 Shopify 身份回调硬套成 Admin 密码重置。统一数据中心不代表所有身份都天然 SSO。

## 数据边界

- 产品、车辆、VIN、客户、经销商、保修、售后等 ALSVID 业务事实由统一 API 管理。
- Shopify 仍然负责商城交易、支付和订单主数据。
- WMS 仍然负责仓库执行数据。
- 各门户只展示与自身角色相关的数据，不直接连接数据库。
- 前端通过 API 访问业务数据，不直连 PostgreSQL，不持有 R2 服务凭据；上传/下载可按 Assets 授权使用短期签名 URL。

## 供应商门户边界 — 2026-10-16

- Supplier Portal 面向 ALSVID 上游供应商，是分阶段交付的独立外部门户目标（#185），不属于 Admin 页面，也不是 Shopify 的 Supplier 字段页面。
- Supplier Portal 与 Admin 共享授权 API 和供应商业务事实，但供应商只能访问其被授权的采购、交付、文件和对账范围。
- 上游供应商履约链路为：Admin 创建/发布 PO → Supplier Portal 确认数量与交期 → 更新生产进度 → 发货通知 → 上传文件/发票 → ALSVID 收货/质检/入库。
- 如果同一企业同时是 ALSVID 的 B2B 买家，其 B2B 采购关系单独使用 Shopify B2B，不与 Supplier Relationship 混成一个权限或订单类型。
- Supplier Portal 的最终 UI 归 Figma；Admin 内部供应商管理和采购流程原型归 Ardot。

## 当前实施状态

- API、内部认证、门户角色种子、Admin/Dealer/My 路由和 Cookie 策略代码存在。
- My 仍有共享车库 fixtures；完整 Shopify 客户身份桥接未在本轮核对中找到；Dealer/Supplier 组织资源范围尚须补齐和验收。
- Supplier 尚无独立门户路由；采购确认等内部能力不能直接作为外部供应商 API 开放。
- 仅 Admin 正式登录/重置页与旧 Web URL 关闭行为完成本轮 HTTP 核对。其他门户、跨应用 SSO 与真实业务闭环按台账逐项验收。
