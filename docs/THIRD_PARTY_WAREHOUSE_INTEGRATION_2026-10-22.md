# ALSVID Admin：第三方仓库 3PL/WMS 对接规范（2026-10-22）

> 状态：用户确认的**后续能力与接口架构规划**，非已上线功能。关联 Issue #295 / Admin 总任务 #212。
> 当前首期面向德国和奥地利，保留未来多个第三方海外仓服务商并行接入能力。**未指定真实仓商，不得声称凭据已配置或任何 API 可用。**

## 1. 目标和范围

Admin 继续使用现有顶栏一级模块「库存」，在该模块内完成自有仓、受托第三方仓、工厂出货与在途货物的统一可视性，不建立第二套库存系统，不改变 ALSVID Admin 命名或正式域名。

建议未来的库存二级组织（**设计预留；页面和可用状态以代码/权限验收为准**）：

```text
库存
├── 库存总览（型号 / SKU / 零件 / VIN）
├── 仓库管理
│   ├── 仓库列表 / 自营仓 / 第三方海外仓
│   ├── 仓库与货品编码映射
│   ├── 第三方仓 API 连接和同步状态
│   └── 库位、库存对账与差异
├── 出入库与调拨
│   ├── 入库 / 出库 / 退货
│   ├── 调拨和在途
│   └── 盘点及异常
└── 库存预警
```

外部接口的凭据管理与系统级审计可由「设置 → 系统集成」跨模块访问；库存运营人员在仓库详情中查看特定仓的连接状态、日志和重试任务（按权限）。

## 2. 数据所有权

| 业务事实 | 权威主体 | ALSVID 需要的内容 |
| --- | --- | --- |
| 商业商品 ID、Variant、SKU | Product | 内部主键与销售组合，不因仓商编码改变 |
| 用户自营官网 B2C 订单及行项目 | Commerce | 不可变订单及价格/SKU 快照、交付需求 |
| ALSVID 库存台账、库存预留和调整 | Inventory | 来源明确的移动流水；不得直接覆盖历史 |
| 自营仓仓位、盘点和受控仓储动作 | Warehouse | 公司管理范围内的实物执行事实 |
| 第三方仓拣货、包装、签收、实存数 | 对应 3PL/WMS | 经认证的库存、发货/退货执行证据，不复制整个 WMS 数据库 |
| 国内工厂生产完成 / VIN / 交付对象 | Production / Vehicle | 保留序列号及实体归属 |
| 出口物流、承运人与跟踪 | Logistics / Carrier | 到货/离仓/配送的必要事实与外部引用 |
| 接口同步游标、收发证据及重放 | Integrations | Provider + account + event ID、更新时间、错误码和重试记录 |
| 授权与人工操作记录 | Identity / Audit | 内部权限 + 行为证据 |

第三方仓库存数量不能由 ALSVID 员工手动声明为其真实实存量；经验证的 WMS 回执可以经领域服务形成必要的库存台账事件或对账差异。**ALSVID 账面预留并不等于外部 3PL 已接受配货。** 不从收到销售订单直接伪造仓库已出库，也不从供应商通知直接伪造已入库。

## 3. 统一映射模型（契约，不是现有数据库已完成的 schema）

| 记录 | 最小字段 |
| --- | --- |
| Warehouse master | internalWarehouseId, name, countryCode, timezone, operatorPartnerId, fulfillmentMode, status |
| Provider connection | providerCode, providerAccountRef, credentialsRef（仅服务端 Secret Manager 引用）, capabilities, connectionStatus, lastSuccessAt |
| Warehouse mapping | internalWarehouseId, providerCode, providerWarehouseId, optionalExternalBin, effectiveFrom |
| Product mapping | internalSkuId / partId / VIN（适用时）, externalSku, externalItemId, providerCode, scope, validationStatus |
| Inventory snapshot | providerWarehouseId, externalItemId, onHand, allocated, blocked, available, asOf, sourceSnapshotRef |
| Outbound order reference | internalOrderId, internalOrderLineId, idempotencyKey, providerFulfillmentId, providerStatus, trackingRef |
| Receipt / return reference | shipmentOrReturnId, providerReceiptId, receivedQty, damagedQty, inspectionStatus, evidenceRef |
| Sync/reconciliation record | connectionId, cursor, lastAttemptAt, lastSuccessAt, sourceVersion, discrepancy, outcome, retryable |

外部 IDs 不充当 ALSVID 内部主键，不跨不同仓商复用。对 VIN / 车架号的关联必须在已有 Vehicle 领域核验，而不是允许仓商直接建立车主或改变车辆出生事实。

## 4. Provider-neutral connector contract

适配器只实现仓商接口差异，调用现有领域的正式用例；**不要在 Integrations 中直接写 Inventory / Warehouse / Commerce 的数据库表**。

```text
WarehouseProviderAdapter
├── testConnection()
├── listWarehouses()
├── getCapabilities()
├── fetchInventorySnapshot({warehouse, cursor?})
├── createInboundNotice({asnRef, items})            [若支持]
├── fetchReceiptStatus({asnRef})                    [若支持]
├── requestFulfillment({orderRef, lines, address})   [若支持]
├── cancelFulfillment({externalOrderRef})           [若支持]
├── fetchFulfillmentStatus({externalOrderRef})       [若支持]
├── fetchShipmentTracking({shipmentRef})            [若支持]
├── fetchReturnAndInspection({returnRef})           [若支持]
└── fetchWarehouseAdjustments({cursor?})            [若支持]
```

返回统一数据类型、UTC 时间/明确当地时区、数量单位与精度、币种（适用于仓储账单）、原始 sourceRef，拒绝未映射 SKU / 不明仓库。接口不支持的能力应通过 capabilities 明示「不支持」，而不是虚构数据。先把最小必需的**库存快照、履约请求、履约状态、运单号**打通；增值能力按服务商实际文档实施。

## 5. 数据流

### 5.1 第三方仓 → Admin 库存

1. 运营人员在 Admin 创建/确认仓库和 3PL 账号；映射仓库与 SKU。
2. 连接成功后，后台任务按商户/仓库安全拉取库存快照，或验证仓商签名 Webhook。
3. 系统核对 provider、仓库、SKU、来源时间、数量单位与重复事件；失配记异常，不更新可用销售库存。
4. Inventory / Warehouse 通过受控领域流程记录来源事实和对账差异。用户看到在库、已锁、待入库、可用、同步时间。
5. 库存超过同步时效或连接失败，Admin 标记「数据可能已过期」，不把失败显示为零库存，不保证可即时发货。

### 5.2 官网订单 → 第三方仓出货

1. Commerce 只有在订单支付已由 Finance/PSP 确认且符合订单状态门禁时，才能发起正式履约申请；预订/预约咨询绝非正式付费订单。
2. Inventory 校验本仓可用量、公司订单预占与映射；必要时先保留**暂定**分配状态，不推断 3PL 已配货。
3. Outbox/Worker 幂等发送履约请求给对应仓的服务端适配器，记录 providerFulfillmentId、已提交/已受理/被拒绝/失败。
4. 3PL 回传配货、拣货、包装、出库、运单。Logistics / Inventory 根据有权限的领域操作转为自己的规范化事实。
5. Commerce 和 My ALSVID / Dealer Portal 只能查看有权限的订单/交付事实与最新成功更新时间。缺少仓方确认时显示「待仓库确认」，不能显示「已发货」。
6. 订单取消、拒收、缺货、部分发货、拆单和退款要联动释放或调整对应预留，防止重复出库。

### 5.3 入库 / 退货 / 调拨

- 中国工厂 → 德国或奥地利 3PL：发货通知不是仓库实收，收到经验证的 receipt（数量、差异、时间）才处理入库；质检状态按实际合同及业务流程确认。
- 工厂 → 经销商直发：不经过第三方仓时，不得生成虚构 3PL 入库及出库。
- 客户退货 / 售后补发：Service/Commerce 保持申请与客户归属事实；3PL 提供退货实收和 QC 证据；财务退款与仓库实收是两条独立事件链。
- 第三方 A 仓 → 第三方 B 仓：两端分别依据真实出库和入库回执确认，在途可追踪，数量差异进入人工复核。

## 6. 同步、重试和安全

- 默认每日定时同步和后台「立即同步」入口；订单出库与物流类事件可采用 provider Webhook 或按服务能力主动刷新。不能没有 SLA 证据就宣称实时。
- 使用 providerCode/account/warehouse/event ID 和版本（如提供）确保幂等、去重、重放与乱序处理；无稳定 event ID 时需设计受审计的内容哈希+业务引用策略。
- 接口错误需区分：未配置、认证失败、映射缺失、额度/限流、接口超时、对账差异、事件过期、真实业务零库存。
- 敏感凭据只通过 Cloud Secret Manager 或批准的同等方式储存，后台 Web 不持有仓商密钥。回调验签、防重放，最小权限；运营操作和重试事件需审计。
- 所有跨租户/跨经销商的数据访问由服务端鉴权，仓储资料不能因知道仓库代码而向非授权用户泄露。

## 7. 建设顺序与验收

**阶段 A（可先实施，无需选定仓商）**
- [ ] 增加仓库类型/外部映射与 provider connection 的设计契约、权限、审计与无真实数据的 UI 空态。
- [ ] 仓库详情设计：同步状态、最近同步、映射完整度、库存差异、待重试、操作日志。
- [ ] 规范 adapter 与领域应用端口，添加仅在隔离 CI 中使用的 contract tests；不让虚构事件进入正式生产。
- [ ] 仓库库存/产品 SKU/订单交付视图统一引用同一套内部业务记录。

**阶段 B（取得首家仓商正式 API 文件及沙箱凭据后）**
- [ ] 选择首家仓商 → 读取官方 API 文档、账号、仓库码、字段语义、限流/验签、能力矩阵。
- [ ] 沙箱验证真实库存/订单/运单/失败重试/部分配货/退货/重复消息。
- [ ] 正式上线使用独立 Secret Manager 凭据、明确责任人和告警，逐仓开启并留回滚方案。
- [ ] 生产用真实样本核验：一个商品的 SKU → 3PL 库存 → 付款已确认订单 → 配货 → 发货跟踪 → 交付可见；无真实发货可先以沙箱链路验收，不伪造生产业务验收。

验收必须分别给出 PR、基线与完成 SHA、CI verify/containers、上线 release SHA、浏览器授权及实际 WMS 证据。**目前仅为需求和接口方案记录，不证明存在已连接的 WMS。**
