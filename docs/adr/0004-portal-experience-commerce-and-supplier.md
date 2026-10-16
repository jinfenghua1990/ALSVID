# ADR 0004 — 门户体验、商业交易与供应商自助边界

- 状态：接受的目标方向；不代表门户功能已交付。
- 日期：2026-10-16。
- 依据：负责人提供的跨会话设计/Shopify/供应商自助沟通、现有四门户决策和当前 main 代码核对。
- 规范：[设计与门户边界](../DESIGN_TOOL_AND_PORTAL_BOUNDARY_2026-10-16.md)。
- 实施证据与排期入口：[门户实施台账](../PORTAL_DELIVERY_PLAN_2026-10-16.md)、Issue #123 / #57 / #185。

## 问题

旧记录把 Dealer 最终 UI 归 Ardot，又把供应商永久限定为 Admin 内部档案；新沟通要求外部门户共享品牌语言并让供应商自行处理业务。已有 `apps/web`、领域服务、角色和演示页面也容易被误读为所有门户、SSO 和真实业务均已完成。

## 决策

1. Admin 的设计/交互来源归 Ardot，外部 Official/Shop、My、Dealer、Supplier 的最终 UI 归 Figma；每页一个确认设计源。设计可以共享基础 tokens，按角色采用不同布局/密度；设计工具不产生第二套代码权威。
2. GitHub 保持唯一软件与架构记录。当前四个核心产品加一个分阶段交付的 Supplier Portal；复用 modular monolith、Partners、统一 API 与数据边界，不按门户数量复制后端/数据库。
3. Official 与 Shop 为同一客户体验。Shopify 负责 B2C/B2B 的买方交易；Dealer 经营/交付/售后由 ALSVID 门户承接。实施前验证实际店铺、客户账户、Company/Location、价格/目录和 Checkout 能力；不自行重造交易系统。
4. Supplier 默认指上游供货关系。其自助提交报价/提案、确认 PO、交期/进度、发货与文件；正式 PO 发布、批准、收货/QC 与付款沿各自权威流程。ALSVID Procurement 是该供应商协同 PO 的写入权威，不与 Shopify 后台采购单做双主。
5. 同一 Partner 可有 Dealer 和 Supplier 两种关系；用户、组织成员、业务角色和外部系统标识各自建模。供应商又买 ALSVID 商品时才使用独立的 Shopify B2B 买家关系。
6. 身份验证与业务授权分开：My 采用 Shopify Customer Account；Dealer/Supplier 的组织授权由 ALSVID 控制。现有登录/Cookie 代码不自动证明映射、隔离或跨应用联登完成。父域 Cookie 不能排除一个子域；外部门户开放前须完成身份与数据范围验收。
7. Supplier 自助是明确的后续建设目标，当前仅有内部采购基础。按台账先补授权和一个可用闭环，再逐页完善 UI；本次记录不授权直接开放内部 API 或重写现有代码。

## 后果与拒绝方案

- 保留已经评审的 Admin/Owner/Dealer 代码与设计资产，按证据渐进整合，避免因为工具归属变化全量重画重写。
- 不采用所有用户共用 Admin 页面、Supplier 冒充 Shopify Buyer、两个 PO 写入主系统、按邮箱自动合并角色，或把 5 个门户理解成 5 套业务数据中心。
- 本 ADR 定的是系统边界；实际店铺套餐、主题/Headless、认证协议衔接和采购细则在实施前验证，不能将未知选择写成已上线事实。
- 未来改变上述边界需记录具体业务理由、数据权威与迁移影响；状态证据持续更新在台账中，而非不断增加互相冲突的“最新”聊天结论。
