# ALSVID Admin 订单 → 生产 / 支付核验 / 退款 — 第一批安全衔接（PR #232）

> 当前代码是后端内部运营建设的一部分，**不是线上自建支付完成**。保护现有旧 Commerce/Production/Finance 和官网源代码。仅供开发分支审核，PR 始终 Draft，禁止意外自动上线。

## 已建设（可从代码和 CI 查验）

- 在原 Admin“订单”模块（原 `CommerceClient` 内）加入 `OrderOperationsPanel`，读取已登记的外部渠道订单与生产执行阻断项。仅使用数据库真实数据；无订单时显示空状态。
- `GET /v1/commerce/operations/readiness`：列出订单、SKU 映射、客户关联和渠道报告状态。所有外部财务状态（含 PAID）只是一项**渠道报告值**，**不是已由 ALSVID PSP 核实的付款证明**，因此当前一律 `paymentVerifiedByPsp=false`、`productionReleaseAllowed=false`、`refundExecutionAllowed=false`；不能当作自动建生产单、放货或打款指令。
- `commerce.refund_review_requests`（迁移 0030）：Finance/Commerce **人工退款审核申请**，附外部订单、待调查金额/币种/原因/操作员工/幂等请求 ID。数据不可变，审核录入不等于批准、支付、退款或财务冲销。
- `GET/POST /v1/commerce/operations/refund-reviews`：仅内部有 `commerce.refund.review` 的管理员可写，另需 `commerce.read` 才能读。交易订单行锁、金额不超过原订单、币种一致、重复请求 ID 幂等、冲突时拒绝、同一事务写审计。
- 测试覆盖 PAID 外部字段不得触发制造、未映射/已取消状态、角色和金额约束、幂等、真实 PostgreSQL 不可变触发器和迁移。

## 还没有，不能宣称已完成

1. **ALSVID 自建正式商城订单**：WWW 商品价格/税额/运费安全计算、消费者合同、订单主表、真正 checkout 及已支付订单还不存在；当前新 UI 只显示 legacy Shopify/Amazon/OTHER **外部订单**，不能将其称为第一方订单。
2. **PSP 收款确认**：尚未选择与中国大陆主体及德国/奥地利业务合规的支付商。没有 API 交易查询、签名 webhook、异步对账、防双扣、成功/失败/未知状态确认。消费者端不可标记付款成功。
3. **销售转生产**：独立 Production 可创建订单并做 QC/VIN，但尚没有第一方已验证支付事实 → 锁定 SKU/颜色/数量 → 库存保留或生产任务 → 生产异常/取消的原子跨域链路。当前安全诊断 UI **不拦截**人工创建的独立生产订单，也不代表订单自动转生产已完成。
4. **真实退款**：没有 PSP Refund API、独立审批、部分退款累计限额、异步回调、冲突重试、拒付/退货、账务对账或通知。退款审核请求不得被展示为“已退款”。旧 Finance `reversePayment` 是账内冲销，不是 PSP 资金返回。
5. **真实 B2C 客户与交付**：Customer Account OAuth、核验交付 → Vehicle VIN → My 的精确归属及客户退款信息流程尚未全面验收。
6. **生产上线**：法律条款、税费/进口责任、SCA/3DS、PSP/商户资质、回滚/事故处理，需另行真实账号沙盒验收和负责人审批。

## 后续建议按业务依赖进行

**下一批**：第一方不可变订单与订单行/总价快照（受服务端价格/税率/物流权威限制），支付尝试 UNVERIFIED/PENDING；独立 PSP 适配协议与合法状态机/幂等；只有经过真正 PSP 核验且风险审批通过的已收款订单可创建有来源标识的生产需求。库存/已开工订单取消与退款需单独补偿逻辑，不可直接退款即撤销生产。

参照已接受 ADR 0005 `docs/adr/0005-alsvid-owned-storefront-and-third-party-payments.md`。
