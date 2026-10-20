# ALSVID 门户实施台账与后续机器人执行顺序

状态：执行基线；核对日期：2026-10-16。目标方向见 [设计与门户边界](DESIGN_TOOL_AND_PORTAL_BOUNDARY_2026-10-16.md)，决策理由见 [ADR 0004](adr/0004-portal-experience-commerce-and-supplier.md)。

本次核对代码基线为 [`cd1dd3531e2ed3f2123f7151df89db9051bfeb61`](https://github.com/jinfenghua1990/ALSVID/commit/cd1dd3531e2ed3f2123f7151df89db9051bfeb61)。表内是代码审阅证据，不是全站业务验收。设计文件未在本轮重新逐层读取；已有链接来自仓库记录，不能升级为本轮设计验收结果。

## 1. 固定方向与实施约束

| 产品边界 | 用户与设计源 | 交易 / 业务职责 |
| --- | --- | --- |
| Official / Shop | 公众、消费者；Figma | 同一官网与商城体验；Shopify 承担商品销售、购物车、结账、支付、退款与商业订单 |
| My ALSVID | 车主；Figma | 经 Shopify 验证的客户映射到 ALSVID 的真实车辆归属、保修与服务 |
| Dealer Portal | 外部经销商；Figma | 经销商经营与服务协同；买货进入 Shopify B2B，门户展示组织范围内的必要业务事实 |
| Admin | 内部员工；Ardot | 产品工程、采购、生产、车辆、运营与内部审批；保持高效业务交互 |
| Supplier Portal | 外部上游供应商；Figma | 已确认的后续建设目标，分阶段交付报价/提案、PO 确认、交期、进度、发货与文件协同 |

“独立门户”指独立用户体验、路由、权限与发布边界。当前可以继续使用 monorepo、`apps/web` 和统一 API；不要求现在拆五个仓库、五套数据库或五套服务器。拆分部署需有实际安全、发布或容量理由。

一个页面只登记一个已确认设计源。Admin 使用 Ardot 不等于只做草稿；外部门户使用 Figma 不等于都采用消费者营销页布局。Dealer/Supplier 应支持密集表格、筛选、批量动作和移动端关键任务。

## 2. 当前实现证据与缺口

| 范围 | 已核对证据 | 当前可下的结论 | 下一步与关联 Issue |
| --- | --- | --- | --- |
| Admin | [设计同步说明](ADMIN_DESIGN_SYNC.md)、[路由清单](../apps/web/app/_design/sync-manifest.json) | 85 个受保护的设计/状态画面已有 fixture renderer；表单编辑不等于领域持久化，也不执行审批/发货 | 逐页建立 UI → 领域 API → 权限 → 审计 → 验收映射；#92 |
| Official | [按 Host 分派的首页](../apps/web/app/page.tsx)、[首页组件](../apps/web/app/_components/home/home-page.tsx) | 已有官网内容与交互组件；“立即购买”等锚点不能证明真实 Shopify 商品/购物车/结账已接通 | 登记 Figma 首页链接；验证主题或 Headless 最小购买闭环后再选正式方案；#57 / #123 |
| My | [车库数据层](../apps/web/app/my/_data/garage.ts)、[页面入口](../apps/web/app/my/page.tsx) | 车库仍返回共享 UI fixtures；切车、VIN、保修、服务记录演示不证明真实所有权 | 受验证客户身份 → Customer/Vehicle 归属 → 账号范围查询；#30 / #48 / #31 |
| Shopify 客户登录 | [登录入口](../apps/web/app/login/page.tsx)、[登录组件](../apps/web/app/_components/portal-login.tsx)、[Auth API](../apps/api/src/auth.controller.ts) | 有可配置 Shopify 登录链接/待配置状态；本轮未发现完整 Customer Account OAuth 回调、令牌交换和外部身份映射闭环 | 以真实 OAuth 客户标识建立最小映射，补回调与失效/注销验收；#50 / #57 |
| Dealer | [门户首页](../apps/web/app/dealer/page.tsx)、[采购页](../apps/web/app/dealer/purchase/page.tsx)、[订单页](../apps/web/app/dealer/orders/page.tsx) | 已有独立页面骨架，部分复用 Admin CSS；采购/订单以空状态说明为主，不能宣称 B2B 下单可用 | Figma 最终稿、成员/组织范围、Shopify 买家/地点上下文与订单查询；#57 |
| 外部门户权限 | [门户入口校验](../apps/web/app/_lib/portal-access.ts)、[AuthContext](../domains/identity/src/core/auth.ts) | 已有角色/权限检查，但入口允许部分内部角色访问 My/Dealer；该检查不足以证明车主或组织资源授权 | 独立支持人员审计视图；外部资源每次由服务端验证成员/所有权；#57 / #50 |
| Supplier | [角色种子](../packages/database/migrations/0021_portal_identity_roles.sql)、[采购 Controller](../apps/api/src/procurement.controller.ts)、[采购服务](../domains/procurement/src/application/procurement-service.ts) | 有 Supplier 角色及内部报价/PO/确认/收货基础；没有 Supplier 门户路由。当前采购服务按能力检查、未见供应商成员范围约束，不能直接开放这些内部 API 给供应商 | 按第 4 节分阶段交付；#185 |
| Shopify 订单事实 | [内部集成入口](../apps/api/src/integrations.controller.ts)、[规范化适配器](../domains/integrations/src/infrastructure/shopify-normalizer.ts) | 已有订单/履约规范化、幂等与重放基础；不证明实际店铺授权、外部 Webhook 或 Customer Account 已连接 | 验证店铺与接口权限、真实投递认证、组织归属、失败重试和对账 |
| 登录 Cookie | [Cookie 策略](../apps/web/app/_lib/session-cookie.ts) | `alsvid_my_session` 使用独立名称/Host-only；业务门户仍有父域 `alsvid_session` 策略。父域 Cookie 也会被浏览器发送到 My 子域，不能称为完全隔离 | 外部门户启用前评审子域信任、Cookie/注销与身份交换方案；本轮不改认证实现 |
| 发布与正式入口 | [.github/workflows](../.github/workflows)、PR #181/#182/#183 | 已有 Admin Canonical URL 与 main CI 成功后显式派发 Production 的配置；文档提交不等于新代码发版 | 每次给出源 commit、CI、生产 release 与浏览器证据，禁止用最新 main SHA 代替实际 release SHA |

2026-10-16 只读 HTTP 核对：`admin.chaibenn.com/login?portal=admin` 与 `/reset-password` 返回 200；两个旧 Web `run.app` 登录地址返回 404。最近成功生产发布证据为 [`15b79ab… / run 38874426159`](https://github.com/jinfenghua1990/ALSVID/actions/runs/38874426159)。这不证明 Dealer、My、Supplier 或商城已各自上线，也不证明重置邮件或真实订单已在本轮完成业务验收。

## 3. 设计资产登记

| 范围 | 仓库已登记的来源 | 本轮状态 |
| --- | --- | --- |
| Admin | Ardot `736467599966143`；节点/路由见 `sync-manifest.json` | 有导入记录；不重删旧资产，不把旧快照当现行画板元数据 |
| My | [Figma 车主车库 V1](https://www.figma.com/design/LuoLxuaizvjNMPbAhubd8i)；[My 架构说明](MY_ALSVID_OWNER_ARCHITECTURE.md) | 已登记，未重新验收；车辆文件与配件画板分拆等缺口沿用原记录 |
| Official | Figma 最终设计归属已确认 | 唯一文件/节点链接及页面验收待登记 |
| Dealer / Supplier | Figma 最终设计归属已确认 | 文件/节点、响应式与业务状态画板待登记 |

每项任务补齐：门户、页面/路由、用户角色、设计链接/节点、设计版本、加载/空/错误/成功状态、业务 API、数据写入权威、实现 commit、CI、release、浏览器和业务验收。资料不全时先做独立可推进项，不从旧工具重新生成全套竞争稿。

## 4. Supplier 自助的明确含义

本项目默认 Supplier 指“向 ALSVID 供货的上游企业”。用户所说“供应商自己下单”在此落实为供应商自己提交和处理其业务单据；不是让供应商同时充当采购审批人、仓库收货人或付款审批人。

| 动作 | 供应商可以自助 | 正式写入 / 批准责任 |
| --- | --- | --- |
| 报价、供货/订单提案、商业条件变更申请 | 提交本组织材料与提案 | Procurement 保存提案；ALSVID 授权人员审核并创建/发布正式 PO |
| 已发布 PO 的数量/交期承诺 | 确认、部分确认或提出变更 | Procurement 校验 PO 归属、行项目、版本和状态；改变获批条件须重新审核 |
| 生产进度、预计完成、延期原因 | 提交与该 PO/批次相关的报告 | Production/Procurement 保留报告来源；供应商报告不等于 ALSVID QC 通过 |
| 发货通知与装箱单 | 分批提交、补充文件 | Logistics/Procurement 记录通知；不直接写成已实收库存 |
| 实物到货、QC、库存 | 查看获授权结果 | ALSVID/WMS 的收货、质检和库存权威流程确认后反映结果 |
| 发票、对账、收款资料 | 提交文件/变更申请与查询允许的结果 | Finance/授权内部流程审核；不自动生成已付款、改银行账户或执行付款 |

最小闭环：邀请成员 → 本组织报价/提案 → Admin 审核/发布 PO → 供应商确认交期 → 进度/发货通知 → 获授权收货/QC → 回显处理结果。分批、拒绝、变更、重复提交与审计均需验收；当前采购状态枚举不能冒充这些全部已实现。

供应商同时向 ALSVID 买货时，另建 Dealer/B2B Buyer 关系，交易走 Shopify。共享 Partner 主体，组织角色、外部标识、单据类型与权限分开；不复制企业主档。

## 5. 后续执行门槛

总优先级由 [Issue #123](https://github.com/jinfenghua1990/ALSVID/issues/123) 管理，下列是门户任务的依赖顺序；页面设计可以并行，真实业务开放必须满足前置项。

1. **G0：基线一致。** 阅读 AGENTS、设计边界、本文、DATA_OWNERSHIP 与身份规范；确认当前 Issue、代码基线与设计源。Issue #20 已关闭，不重复重建平台，也不恢复 #61/#68 对应的退役 Test/M1 云发布链。
2. **G1：身份和数据范围。** 员工仍走 ALSVID 身份；My 走 Shopify Customer Account 验证；Dealer 保留现有 ALSVID 业务登录，Shopify 交易必须建立经验证的买家/Company/Location 映射；Supplier 使用企业成员邀请。邮箱相同、角色名称或 Cookie 存在都不是组织/车辆授权。每个外部读写 API 从服务端会话推导范围，不信任前端随意传入的 Partner/Company/Vehicle ID。关联 #50/#57。
3. **G2：先做可用业务切片。** Official 完成一个真实商品到 Shopify Checkout；My 完成一个真实账户到其车辆/服务；Dealer 完成一个获授权地点到 B2B 下单/订单回查；Supplier 按 #185 完成第 4 节最小闭环。互不强行等所有页面设计完毕。主题/Headless、店铺套餐、API scopes、公司地点与实际账户须逐项验证；不在未知店铺条件下重造结账。
4. **G3：逐页整合设计与数据。** 复用既有领域/组件，逐页替换已明确的 fixture 或 CSS；保留必要空状态，不因 Ardot/Figma 归属改变全站重写。外部企业页面的权限和表格效率优先于装饰动效。
5. **G4：发布与验收。** PR → CI → main CI → 自动派发 Production → 实际 release → 域名/浏览器/业务验收。文档-only 变更跳过生产部署。新门户通过独立认证、组织隔离、文件授权及真实业务验收后才显示可用入口。

G1 至少覆盖两个组织/两个车主账号、ID 替换、同一企业双角色、成员停用、会话失效、分页/导出/附件范围及跨门户访问。Supplier 写操作另测 PO 行归属、版本冲突、重复回调/提交、部分交付和内部审批边界。

## 6. 需验证后再落地的选择

- Shopify 当前店铺域名、套餐/功能开通、API 权限与真实 B2B 需求；当前官方说明 B2B 能力依套餐区分，不能套用“全部功能都已有”或“全部 B2B 仅 Plus 可用”的旧结论。
- Official 原生主题或 Headless 的实施路线；允许 Shopify 托管 Checkout/客户账户所需跳转，不把“统一 www 品牌体验”误解为强制全部同源。
- Dealer ALSVID 登录与 Shopify 买家身份如何绑定/衔接；完成验证前不替换现有登录，也不宣称两边天然 SSO。
- Cookie 信任边界与协议式 SSO 的迁移方案；当前父域 Cookie 代码只是现状，不能代替隔离验收或扩展到 `.run.app`。
- MOQ、价格审批、信用/账期、发票/对账及供应商可发起的单据细则；没有真实业务依据不编造字段含义与审批人。
- 新正式域名 `alsvidbike.com` 已确定；DNS/TLS、Cloud Run 自定义域名、认证回调与邮件发件域仍需实际验收，不能仅凭代码修改认定生产迁移完成。

## 7. 后续机器人交付格式

每个 PR 说明：解决谁的什么任务、复用哪个领域、具体资源范围、数据写入者、设计来源、验证结果和仍未完成项。分别记录“设计已确认 / 代码存在 / CI 通过 / 已部署 / 业务验收”；没有证据不得勾选完成。更新本台账时保留旧基线及迁移依据，不用新聊天覆盖已确认边界。

## 8. 官方能力依据（核对日：2026-10-16）

- [Shopify B2B 公司与地点](https://help.shopify.com/en/manual/b2b/companies-and-customers/creating-companies)：是企业买方上下文。
- [B2B 客户登录](https://help.shopify.com/en/manual/b2b/customer-login-and-accounts)：客户账户/邮箱验证码与公司地点权限；不等于 ALSVID 外部门户已接通。
- [B2B 功能与套餐限制](https://help.shopify.com/en/manual/b2b/getting-started/considerations)：实施前核对当前店铺能力，不据此猜测 ALSVID 套餐。
- [Shopify 供应商与采购单](https://help.shopify.com/en/manual/inventory-and-locations/purchase-orders/managing-suppliers)：商家后台可管理采购对象；ALSVID 的工程、生产协同与供应商门户仍按自身需求实现，此为本项目架构选择。
- [Customer Account OAuth/PKCE](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/authenticate-customers)：完成受验证身份交换后再授予 ALSVID 自身业务资源。
- [Headless B2B 买方上下文](https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/b2b)：买家/地点决定采购上下文，个性化价格与目录不能跨组织共享缓存。
