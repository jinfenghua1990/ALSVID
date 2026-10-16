# Decision Log

## 2026-10-16 — 设计语言、买方交易与供应商自助

- 状态：active（目标方向；不是上线声明）。
- Ardot 作为 Admin 内部运营设计来源；Figma 作为 Official/Shop、My、Dealer 和 Supplier 的最终 UI 来源。一个页面只保留一个确认设计源，复用代码不决定设计归属。
- Official 与 Shopify Shop 保持同一品牌/商城体验，Shopify 负责买方交易；不新增独立公开 Shop 产品或复制结账系统。
- Supplier 自助是已确认的后续交付目标：供应商可自己提交报价/订单提案并履约，ALSVID 保留正式 PO 发布、批准、收货/QC 与付款责任。一个 Partner 可以同时为 Dealer/Supplier，但关系和权限分开。
- 保留模块化 API、现有领域和共享基础设施；分门户不意味着复制后端/数据库。先补受验证身份与组织/车辆范围，再开放真实业务数据。
- 执行依据：[设计与门户边界](../../docs/DESIGN_TOOL_AND_PORTAL_BOUNDARY_2026-10-16.md)、[ADR 0004](../../docs/adr/0004-portal-experience-commerce-and-supplier.md)、[代码证据与交付顺序](../../docs/PORTAL_DELIVERY_PLAN_2026-10-16.md)。任务由 #123/#57/#185 跟踪，资料不全的商业细则保持待确认。

## 2026-10-14 — 知识库先放在 ALSVID 主仓库

- 状态：active
- 决策：知识库暂时放在主仓库的 `/knowledge/`，与代码一起版本管理。
- 原因：当前网页、架构、系统和 AI 工作都需要读取同一套背景和规则；集中放置可以减少重复沟通。
- 后续：工程体系稳定、权限边界变复杂后，再评估拆成独立仓库。

