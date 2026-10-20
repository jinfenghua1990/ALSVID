# My ALSVID

status: active
owner: ALSVID
last_reviewed: 2026-10-20

为车主或用户提供产品信息、订单/车辆信息、服务支持和售后入口。用户隐私和车辆运行数据属于系统数据，不写入知识库。

负责人确认后续不使用 Shopify。My 采用 ALSVID 自有邮箱验证与独立车主会话；新注册只授予 customer_user，不自动获得内部或组织角色。验证码绑定客户验证上下文，不能用于内部账号或首位管理员激活。知道邮箱、同一邮箱或知道 VIN 都不证明车辆归属；所有车辆与售后数据仍依赖服务端业务关系。

登录入口沿用本次确认的大标题/自行车、冷色渐变、无框横向表单与单一 CTA；业务页面不因此重画。外部页面设计来源仍保持每页一个确认源，车辆资产区域称“我的车库”。

当前分支正在实现新的自有身份与统一登录体验，生产是否完成以合并、CI、完整发布及实际验收为准；不因代码或页面存在而宣称真实车辆、保修和售后数据已接通。

依据：[ADR 0006](../../docs/adr/0006-first-party-portal-auth-and-login-experience.md)、[My 架构](../../docs/MY_ALSVID_OWNER_ARCHITECTURE.md)、[门户实施台账](../../docs/PORTAL_DELIVERY_PLAN_2026-10-16.md)，Issue #30/#48/#57。
