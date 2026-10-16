# ALSVID 统一后端与四门户登录架构

> 当前使用 `chaibenn.com` 临时域名；未来切换到 `alsvid.com` 时，SSO 结构不变。

## 固定架构

ALSVID 使用：

- 一个统一的 ALSVID API 后端
- 一个身份认证与会话中心
- 一个环境内的 PostgreSQL 数据中心
- 一个环境内的 R2 对象存储
- 四个核心独立前端门户；Supplier Portal 作为未来第五个外部业务门户预留

四个核心前端分别是：

- ALSVID Official：官网与 Shopify 商城前端
- ALSVID Admin：公司内部运营后台
- ALSVID Dealer Portal：经销商 / B2B 门户
- My ALSVID：车主与车辆生命周期中心

四个核心项目是独立前端项目，不是同一系统中的页面。Supplier Portal 未来启用后同样保持独立入口、独立权限边界。前端可以独立部署、独立迭代，共用统一身份认证及受授权 API；大部分入口关系为跨应用跳转，业务数据只按所需事实部分联动，不复制后端、数据库、认证或完整外部业务数据。

Admin 顶部右侧的应用切换器显示“官网、车主中心、经销商平台”，在新标签打开目标应用并保留 Admin 状态。项目名和入口显示名按 [APP_ENTRY_ARCHITECTURE.md](APP_ENTRY_ARCHITECTURE.md) 与 [SYSTEM_NAMING.md](SYSTEM_NAMING.md) 执行。

## 环境隔离

生产环境：

- Production API
- Production PostgreSQL
- Production R2
- 生产身份会话

开发环境：

- Development API
- Development PostgreSQL
- Development R2
- 开发身份会话

开发和生产保持相同的 API、认证和业务流程，但数据、密钥、存储和运行资源完全隔离。

## 单点登录

同一环境下，内部业务门户共享 ALSVID 会话；My ALSVID 的 Shopify Customer 身份保持独立：

- Admin、Dealer、Supplier / Service 使用生产 Cookie 作用域：.chaibenn.com
- Admin、Dealer、Supplier / Service 使用开发 Cookie 作用域：.dev.chaibenn.com
- My ALSVID 使用独立的 `alsvid_my_session` Host-only Cookie，不与内部门户共享
- 用户访问临时 Cloud Run Web 地址时，生产 Proxy 会保留路径与查询参数并跳转到 `AUTH_BASE_URL`
- Cookie 只保存短期会话令牌，不保存业务数据
- 每个门户进入页面时都通过统一 API 的 /v1/auth/me 验证会话
- 会话是否有权访问某个门户，由后端角色与权限判断
- 退出内部门户时，同时撤销后端会话并清除内部共享 Cookie；退出 My 时清除其独立 Cookie

生产认证链接的唯一基址由 Cloud Run 环境变量 `AUTH_BASE_URL` 提供。Web 服务会把浏览器从临时 `run.app` 地址重定向至该基址，API 用它生成密码重置链接。

目标体验是：用户登录后，在同一环境内跳转至有权访问的其他项目时复用身份。该体验需在独立前端和域名完成后逐项验证；目标项目仍须验证权限，Shopify Customer 映射不能假设天然互通。

## 数据边界

- 产品、车辆、VIN、客户、经销商、保修、售后等 ALSVID 业务事实由统一 API 管理。
- Shopify 仍然负责商城交易、支付和订单主数据。
- WMS 仍然负责仓库执行数据。
- 各门户只展示与自身角色相关的数据，不直接连接数据库。
- 前端永远通过 API 访问数据，禁止前端直连 PostgreSQL 或 R2。

## 供应商门户边界 — 2026-10-16

- Supplier Portal 面向 ALSVID 上游供应商，是未来独立外部门户，不属于 Admin 页面，也不是 Shopify 的 Supplier 字段页面。
- Supplier Portal 与 Admin 共享授权 API 和供应商业务事实，但供应商只能访问其被授权的采购、交付、文件和对账范围。
- 上游供应商履约链路为：Admin 创建/发布 PO → Supplier Portal 确认数量与交期 → 更新生产进度 → 发货通知 → 上传文件/发票 → ALSVID 收货/质检/入库。
- 如果同一企业同时是 ALSVID 的 B2B 买家，其 B2B 采购关系单独使用 Shopify B2B，不与 Supplier Relationship 混成一个权限或订单类型。
- Supplier Portal 的最终 UI 归 Figma；Admin 内部供应商管理和采购流程原型归 Ardot。

## 当前实施状态

- 统一 API 与身份认证已经存在。
- 共享门户会话 Cookie 策略已加入现有 Web 应用。
- 四门户独立前端仍按固定地址逐步拆分和部署。
- 自定义域名与 DNS 完成后，四个门户使用固定域名访问。
