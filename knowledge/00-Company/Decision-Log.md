# Decision Log

## 2026-10-20 — 自有车主身份与统一登录入口

- 状态：active（负责人确认方向；生产验收仍需独立证据）。
- 后续不使用 Shopify；My 登录不再以前往 Shopify Customer Account 或配置其登录链接为前提，采用 ALSVID Identity 邮箱验证和独立车主会话。
- 车主注册与内部注册分开，不从验证邮箱自动授予内部、管理员或企业组织权限；车辆归属继续由真实业务关系决定。
- Admin、Dealer、My 的登录入口采用本次确认的共同品牌语言及动画，复用实现但保持身份和权限边界。该决定不授权重画各门户已确认的业务工作区。
- 来源：[ADR 0006](../../docs/adr/0006-first-party-portal-auth-and-login-experience.md)。

## 2026-10-19 — 自建消费者结账与第三方支付

- 状态：active（架构决策；尚未实施或上线）。
- 首期不购买或依赖 Shopify。ALSVID 自己负责官网商品选择、购物车、结账编排、消费者订单记录和订单状态；不建设通用多渠道 OMS。
- 真实银行卡处理、强客户认证/3-D Secure（适用时）、资金收付由经审核且批准 ALSVID 中国大陆公司的第三方支付服务商执行。ALSVID 不存储完整卡号或安全码。
- Commerce 负责 ALSVID 自营官网订单；Finance 负责支付尝试、经验证的支付状态、退款、分配与结算；Integrations 负责签名验证、幂等和支付事件接入；WMS 负责仓库实物执行。
- 当前只建立架构、风控规则、测试与消费者说明基础；支付机构尚未选定/接入，真实下单与收款必须保持关闭。
- 依据：[ADR 0005](../../docs/adr/0005-alsvid-owned-storefront-and-third-party-payments.md)。上线前需通过该 ADR 的商户资质、法律文本、金额/税费/物流、重复支付、Webhook、退款、拒付、对账和监控验收。

## 2026-10-16 — 设计语言、买方交易与供应商自助

- 状态：active（设计语言与供应商自助仍有效；其中 Shopify 负责 B2C 买方交易的旧决定已被 ADR 0005 取代）。
- Ardot 作为 Admin 内部运营设计来源；Figma 作为 Official/Shop、My、Dealer 和 Supplier 的最终 UI 来源。一个页面只保留一个确认设计源，复用代码不决定设计归属。
- Official 保持 ALSVID 官网与商城一体化体验；此处关于 Shopify 负责买方交易的旧决定已由 2026-10-19 的 ADR 0005 对首期 B2C 交易边界取代。
- Supplier 自助是已确认的后续交付目标：供应商可自己提交报价/订单提案并履约，ALSVID 保留正式 PO 发布、批准、收货/QC 与付款责任。一个 Partner 可以同时为 Dealer/Supplier，但关系和权限分开。
- 保留模块化 API、现有领域和共享基础设施；分门户不意味着复制后端/数据库。先补受验证身份与组织/车辆范围，再开放真实业务数据。
- 执行依据：[设计与门户边界](../../docs/DESIGN_TOOL_AND_PORTAL_BOUNDARY_2026-10-16.md)、[ADR 0004](../../docs/adr/0004-portal-experience-commerce-and-supplier.md)、[代码证据与交付顺序](../../docs/PORTAL_DELIVERY_PLAN_2026-10-16.md)。任务由 #123/#57/#185 跟踪，资料不全的商业细则保持待确认。

## 2026-10-14 — 知识库先放在 ALSVID 主仓库

- 状态：active
- 决策：知识库暂时放在主仓库的 `/knowledge/`，与代码一起版本管理。
- 原因：当前网页、架构、系统和 AI 工作都需要读取同一套背景和规则；集中放置可以减少重复沟通。
- 后续：工程体系稳定、权限边界变复杂后，再评估拆成独立仓库。

