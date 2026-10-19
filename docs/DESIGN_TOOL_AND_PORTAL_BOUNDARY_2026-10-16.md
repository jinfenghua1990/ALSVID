# ALSVID 设计工具、门户与 Shopify 边界 — 2026-10-16

> **2026-10-19 更新：** 本文关于“Shopify 负责首期 B2C 订单、结账与支付”的旧决定由 [ADR 0005](adr/0005-alsvid-owned-storefront-and-third-party-payments.md) 取代。首期改为 ALSVID 自建商城与订单流程，真实付款使用待选第三方支付机构，尚未开放。其余设计工具归属、门户权限与供应商协同原则仍按已确认条款执行。

> **后续用户确认：** 对外页面由 Penpot 整合对话负责连贯设计、前端交互与链接，可使用 Figma 或 Penpot，每页保留唯一确认设计源。覆盖官网、My ALSVID、Dealer Portal、商品详情与购物袋；Admin 继续沿用 Ardot。当前代码状态、目标链路与验收见 [Penpot 对外页面整合台账](PENPOT_EXTERNAL_PORTAL_INTEGRATION.md)。下文原有 Figma 归属须结合此次补充理解，不代表必须把已确认的 Penpot 首页再迁回 Figma。

> **状态：最新确认基线，后续 AI / 设计 / 开发任务必须以本文为准。**
>
> 本文同步 2026-10-16 的最新沟通结论，重点解决“哪个工具设计什么、哪个门户给谁用、Shopify 承担什么、供应商以后如何自助”的边界问题。
>
> **重要：本文只定义目标架构与设计归属，不代表所有页面、接口、Portal 或 Shopify 能力已经开发、接通或上线。实际完成状态必须以 GitHub 代码、CI、部署和业务验收为准。**

> 执行配套：[ADR 0004](adr/0004-portal-experience-commerce-and-supplier.md) 记录选择理由；[门户实施台账](PORTAL_DELIVERY_PLAN_2026-10-16.md) 记录当前代码证据、缺口、设计资产和依赖顺序。遇到历史文档冲突，以本目标边界和配套台账明确的状态为准，不从旧聊天重建另一套规则。

## 1. 一句话原则

- **Ardot = ALSVID 内部运营系统的快速设计 / 原型工具。**
- **Figma = ALSVID 所有对外用户门户的最终 UI / 视觉设计工具。**
- **GitHub = 架构、需求、代码和最终实现的唯一事实来源。**
- **Shopify = B2C/B2B 商业交易底座，不承担 ALSVID 内部运营，也不承担完整的上游供应商协同门户。**
- **Supplier Portal = 已确认的后续外部供应商自助建设目标，按 #185 分阶段交付，当前尚未交付；不因为暂未开发而把供应商业务硬塞进 Shopify。**

## 2. 最终设计工具归属

### Ardot：内部运营

Ardot 负责：

- ALSVID Admin
- 工作台
- 产品
- 订单
- 生产
- 库存
- 经销商管理（内部视角）
- 客户
- 售后
- 供应链
- 供应商管理
- 数据
- 设置
- 内部采购 / PO / 供应链业务流程原型

Admin 的用户是 ALSVID 内部员工。设计优先级是：

**效率 > 信息密度 > 操作路径 > 状态可读性 > 视觉营销。**

固定 UI 原则：

- 顶部一级导航
- 进入模块后显示当前模块左侧二级导航
- 右侧工作区
- 表格、筛选、抽屉、表单、状态、批量操作优先
- 业务页面优先状态、表格和操作效率；现有已评审工作台 Hero 可保留，不因设计工具归属变化直接重写；不套用购物车和消费者账户导航
- 可以保持克制、专业、SaaS/运营后台风格

### Figma：所有对外门户

Figma 负责最终 UI：

1. **ALSVID Official / Shop**
2. **My ALSVID**
3. **ALSVID Dealer Portal**
4. **未来 Supplier Portal**

这些门户共享 ALSVID 品牌设计语言，但**不共享同一个页面模板**。

设计优先级根据对象变化：

- Official / Shop：品牌视觉、产品展示、购买转化
- My ALSVID：车主资产、车辆信息、服务体验
- Dealer Portal：B2B 工作效率 + ALSVID 品牌连续性
- Supplier Portal：供应商业务协同效率 + ALSVID 品牌连续性

### 不允许的情况

- 不把 Dealer Portal 最终 UI 固定在 Admin/Ardot 的后台视觉体系中。
- 不把 Supplier Portal 做成 Admin 的一个公开页面。
- 不让 Ardot 和 Figma 同时维护同一个页面的两个“最终设计稿”。
- Ardot 中出现“官方首页 / 我的车库 / 经销商入口”等文字，只代表跨应用入口，不代表这些页面属于 Ardot 设计范围。
- Figma 页面最终落地后，GitHub 代码才是实际实现来源。

## 3. ALSVID 门户结构

核心四个正式项目保持不变：

```text
ALSVID Official
My ALSVID
ALSVID Dealer Portal
ALSVID Admin
```

另行预留：

```text
Supplier Portal
```

Supplier Portal 是后续第五个**外部业务门户**，不是五个都已上线的声明。现在必须把身份、组织范围与采购契约设计成可交付自助闭环；实施排期由 #123/#185 管理，不能长期只留一个 Supplier 字段来代替需求。

独立门户是产品、体验、权限和发布边界；当前仍可在 `apps/web` 内分阶段实现并复用模块化 API。没有实际需求不强拆五个仓库、后端或数据库。

目标域名：

```text
www.alsvid.com
my.alsvid.com
dealer.alsvid.com
admin.alsvid.com
supplier.alsvid.com   # future
```

当前生产规范使用 `chaibenn.com` 体系，Admin Canonical URL 为 `https://admin.chaibenn.com`；`alsvid.com` 仅是未来品牌域名目标，不据此改 DNS 或认证配置。其他门户实际 DNS / 部署状态逐项验收，详见 [PORTAL_DOMAINS.md](PORTAL_DOMAINS.md)。

## 4. 五类用户与职责

| 用户 | 入口 | 核心职责 |
| --- | --- | --- |
| 公众 / 消费者 | Official / Shop | 浏览产品、购买、查看商城订单、进入车主中心 |
| 车主 | My ALSVID | 车辆、VIN、保修、服务、维修、售后、文件、配件 |
| 经销商 | Dealer Portal | B2B 采购、订单、交付车辆、库存/可供货、售后、配件、资料 |
| ALSVID 员工 | Admin | 产品、订单、生产、库存、经销商、客户、售后、供应链、数据、设置 |
| 上游供应商 | Supplier Portal | 接收/确认采购订单、交期、生产进度、发货、文件、对账等 |

同一企业未来可以同时存在不同业务关系，例如：

```text
Company A
├── Dealer Relationship
│   └── 从 ALSVID 采购
└── Supplier Relationship
    └── 向 ALSVID 供货
```

**企业主体可以相同，但业务关系、权限、订单类型和数据范围必须分开。**

## 5. Shopify 的最终边界

Shopify 负责：

- B2C 商品交易
- B2C / B2B 商品目录
- B2C / B2B 购物车
- Checkout
- Payment
- 退款等商业交易能力
- Shopify Customer Account
- B2B Company / Company Location / Company Contact
- B2B Catalog / Pricing
- B2B 订单及相关结账流程

Shopify 不负责：

- ALSVID 员工 Admin
- 生产管理
- VIN / Vehicle 生命周期
- ALSVID 售后 / 保修业务事实
- WMS 仓库执行
- 完整的上游供应商生产协同门户

Shopify B2B 原生模型以 Company、Company Location、Company Contact、Catalog 等对象承载企业买方关系；这适合“某企业向 ALSVID 采购”的 B2B 场景。

因此：

**Dealer 作为 B2B 买家时，优先利用 Shopify B2B，而不是自己重新造一套结账系统。**

## 6. Supplier 的两种业务关系必须分开

### A. Supplier = ALSVID 上游供应商（主要供应链场景）

这是 ALSVID 当前供应链体系应采用的定义。

业务链路：

```text
ALSVID Admin
    ↓
采购需求 / PO
    ↓
Supplier Portal
    ↓
供应商登录
    ↓
确认 PO
    ↓
确认数量 / 交期
    ↓
更新生产进度
    ↓
发货通知
    ↓
上传装箱单 / 发票 / 相关文件
    ↓
ALSVID 收货 / 质检 / 入库
```

Supplier Portal 的核心不是“商城下单”，而是**供应商自助履约**。

供应商自己完成信息确认和履约操作，员工不再替供应商重复录入。

自助还包括供应商提交报价、供货/订单提案和变更申请；正式 PO 发布、获批商业条件、实物收货/QC、财务入账与付款保持独立授权责任。供应商发货通知不自动增加实收库存，上传发票不代表已批准或已付款。具体动作矩阵见[实施台账第 4 节](PORTAL_DELIVERY_PLAN_2026-10-16.md#4-supplier-自助的明确含义)。

### B. Supplier 同时也是 ALSVID 的 B2B 买家

如果未来某个供应商又从 ALSVID 购买自行车、配件或其他商品，则它同时拥有：

```text
Supplier Relationship
+
B2B Buyer Relationship
```

这种“向 ALSVID 买货”的订单可以走 Shopify B2B。

因此不要把“供应商身份”和“供应商向 ALSVID 采购”混成一个业务对象。

## 7. Supplier Portal 从现在就预留

即使当前暂不开发完整 Supplier Portal，也必须在设计和业务模型上预留：

### 供应商首页

- 待确认采购订单
- 生产中订单
- 即将到期交期
- 待发货
- 待提交文件
- 异常 / 需要处理事项

### 采购订单

- PO 列表
- PO 详情
- 确认 / 部分确认
- 数量
- 单价
- 交期
- 备注
- 历史版本

### 生产协同

- 生产状态
- 预计完成时间
- 延期原因
- 生产异常
- 批次 / 关联 SKU

### 发货

- 发货通知
- 物流信息
- 装箱单
- 发票
- 相关文件

### 资料与账户

- 文件资料
- 联系人
- 企业信息
- 收款 / 对账信息
- 权限成员

具体字段和审批规则以后按真实采购流程落地，不能现在编造不存在的业务规则。

## 8. 设计语言应该怎样统一

### 不是“所有门户长一样”

而是：

**共享品牌语言 + 按角色改变交互密度。**

```text
ALSVID Brand Design System
        │
        ├── Official / Shop
        │     └── Brand / Product / Commerce
        │
        ├── My ALSVID
        │     └── Owner / Vehicle / Service
        │
        ├── Dealer Portal
        │     └── B2B / Purchase / Delivery / Service
        │
        └── Supplier Portal
              └── Procurement / Production / Delivery
```

Admin 独立使用：

```text
ALSVID Operations Design System
        └── Admin / Internal Operations
```

两个设计系统可以共享基础 token（字体、品牌色、Logo、基础控件原则），但**布局、导航、信息密度、交互模式可以不同**。

## 9. GitHub 落地规则

以后任何 AI / 设计工具接手 ALSVID，必须先阅读：

1. 根目录 `AGENTS.md` 与相关知识库规则
2. 本文件与 `docs/adr/0004-portal-experience-commerce-and-supplier.md`
3. `docs/PORTAL_DELIVERY_PLAN_2026-10-16.md` 与 `docs/CURRENT_STATE.md`
4. `docs/AI_CONTEXT.md`、`docs/BUSINESS_BOUNDARY.md`、`docs/DATA_OWNERSHIP.md`
5. 对应项目架构文档和当前 Issue

然后遵守：

```text
设计工具
   ↓
确认页面 / 流程 / 交互
   ↓
GitHub
   ↓
代码实现
   ↓
CI
   ↓
正式部署
   ↓
浏览器实际验收
```

设计稿存在 ≠ 代码完成。

代码完成 ≠ CI 通过。

CI 通过 ≠ 正式上线。

正式上线 ≠ 业务验收完成。

## 10. 本次决策的直接调整

当前仓库中已经存在的旧归属：

```text
Ardot = Admin + Dealer
Figma = Official + My
```

现在调整为：

```text
Ardot
└── Admin

Figma
├── Official / Shop
├── My ALSVID
├── Dealer Portal
└── Supplier Portal（future）

Shopify
└── B2C + B2B commerce

ALSVID Admin / Backend
├── Supplier management
├── Procurement
├── Production
├── Inventory
└── other internal operations
```

**现有代码不要因为本文自动重写。** 下一步由实施机器人读取本文后，对现有页面逐项盘点：哪些是视觉归属错误、哪些只是代码复用、哪些需要迁移、哪些可以保留。没有明确实施计划前，不删除现有设计资产或业务代码。

## 11. 完成后的检查清单

下一轮代码 / 设计检查必须确认：

- [ ] Admin 不再把 Dealer 当成内部后台视觉。
- [ ] Dealer Portal 最终 UI 归 Figma。
- [ ] Official / Shop 最终 UI 归 Figma。
- [ ] My ALSVID 最终 UI 归 Figma。
- [ ] Supplier Portal 作为未来独立门户预留。
- [ ] Supplier 上游履约不依赖 Shopify 来冒充供应商门户。
- [ ] Supplier 如果作为 B2B 买家采购 ALSVID 产品，使用 Shopify B2B 能力。
- [ ] Admin 的供应商管理继续保留。
- [ ] Shopify 不被改造成 ALSVID ERP / WMS / Supplier Portal。
- [ ] GitHub 文档、代码、路由和设计资产归属最终一致。
- [ ] 所有“已完成”结论都有代码 / CI / 部署 / 浏览器证据。

---
最后更新：2026-10-16

## 12. 本次核对后的执行补充

- My 的 Shopify 登录来源是目标；当前登录链接、独立 Cookie 和演示车库不能证明 OAuth 回调/客户映射/车辆归属已接通。
- Dealer 的 ALSVID 业务登录与 Shopify B2B 买家登录须经验证建立映射；当前不替换现有登录，不按邮箱相同直接联通或合并权限。
- Supplier 的角色种子和内部采购 API 已存在，但还缺成员/组织范围与独立门户。不得直接向供应商授予全局内部采购权限来交付“自助”。
- 父域 Cookie 会发送到所有匹配子域，不能通过独立 My Cookie 名称来宣称运输层隔离；外部门户开放前按身份规范完成信任边界与权限验收。
- 官方当前 B2B 能力依套餐、客户账户、公司地点及店铺配置而定；实际店铺能力、主题/Headless 与设计文件逐项验证。资料依据与缺口统一维护在实施台账，避免在本文件复制易变功能清单。
