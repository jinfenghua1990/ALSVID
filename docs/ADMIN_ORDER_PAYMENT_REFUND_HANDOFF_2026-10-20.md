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

## 第二批已写入代码（同一 Draft PR #232，等待 CI）

- 新迁移 `0031_first_party_storefront_orders.sql` 建立与外部渠道订单隔离的 `commerce.storefront_orders`、不可变 `storefront_order_lines`、追加式 `storefront_order_events`、市场价格版本 `storefront_prices` 与 PSP 成功付款证据表。
- 新建 `StorefrontOrderService` 和内部 API：`GET /v1/commerce/storefront/summary`、`POST /prices`、`POST /prices/:id/activate`、`POST /prices/:id/retire`、`POST /orders`、`POST /orders/:id/cancel`。权限单独控制；创建订单时由服务端读取当前有效价格，不接受浏览器传入总价；以请求 ID 和 payload hash 保证幂等。
- Admin 订单页新增“自建商城订单与价格”区域。可为有效 SKU 分别建立 DE/AT 的 EUR 含税价格草稿、启用/退役价格版本，并建立含价格/税额快照的内部订单草稿。税率基点由管理员录入，当前未经过税务/法律核验。
- 新订单只会以 `DRAFT / NOT_CONFIGURED` 建立；没有“手动标记已付款”、公共结账、PSP 支付发起或库存预留接口。价格快照和订单行不可修改；数据库延迟约束核对订单总额与明细合计。
- 生产单增加可选 `sourceStorefrontOrderLineId`，并提供 `POST /v1/production/orders/from-storefront/:id`。生产服务在一个数据库事务内检查：订单确实已付款、不可变 PSP 成功证据的签名与订单绑定标志已记录、金额和币种精确匹配、税务配置已批准、Factory 角色有效、Build Specification 已发布且 SKU 匹配、生产数量等于销售行数量；多行订单按行创建并通过唯一来源关联实现幂等。数据库触发器再次强制校验，旧的无来源人工生产计划仍按原规则运行。生产负责人逐单释放生产单，最后一个关联生产单释放后，销售订单才会进入 `IN_PRODUCTION`。
- 新增 `storefront-orders.test.ts` 与真实 PostgreSQL 集成测试，覆盖税额计算、权限、价格版本、价格/订单快照不可变、幂等请求、总额对账和未付款时生产关联被拒绝。

## 仍未完成、不可用于真实交易

1. **公共 WWW 结账未启用。** 当前第一方订单 API 是内部草稿管理，只在 Admin 身份认证后可用；没有面向消费者的创建订单、购物车、下单承诺页或订单查询。
2. **PSP 尚未选择/连接。** 没有 payment intent、provider webhook 签名校验、交易查询、重放防护、对账和真正将订单推进至 `PAYMENT_PENDING` / `PAYMENT_VERIFIED` 的适配器。付款证据表是后续接入的存储边界，不是当前已完成的支付验证器。生产需求 API 因此会拒绝目前的所有草稿订单。
3. **价格/税务未获正式批准。** 价格和税率是内部配置数据，当前 UI 明示未完成正式结账合规核验；不可把它当作对消费者的最终报价或德国/奥地利税务意见。
4. **销售转生产已具备受控的后端入口，但当前不可触发成功。** `createFromStorefrontOrder` 会在一个事务中核验付款/税务/工厂/BOM/SKU/数量，并创建来源关联生产单；数据库触发器同样阻止未付款关联。由于 PSP 和税务批准流程尚未实现，当前没有订单能满足这些条件。仍未实现库存预留、交付安排、生产单取消补偿或发货后的订单完成确认。
5. **取消与退款仍是不同流程。** 内部未付款草稿可以取消；已付款订单的取消/退款必须另做审批、PSP 退款、异步确认、累计退款上限和财务对账。旧 Finance `reversePayment` 只是账内冲销，不是资金退回。
6. **PR 未合并、未发布。** 必须等完整 CI（数据库迁移、类型检查、所有测试、容器构建与冒烟检查）通过后再审核；保持 Draft，不得触发正式部署。

