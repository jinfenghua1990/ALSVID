# ALSVID System Naming

> Status: **Frozen / 已确认**
>
> 本文是 ALSVID 对外网站、内部系统、经销商门户、车主门户以及部署命名的权威规则。后续文档、代码、UI、部署和沟通默认使用本文命名；除非有新的明确架构决策，否则不再重新命名。

## 1. Canonical product names

| Canonical name | 中文定义 | 主要对象 | 说明 |
| --- | --- | --- | --- |
| **ALSVID Official** | ALSVID 官网 | 消费者、访客 | 品牌官网、产品展示、内容和消费者主入口 |
| **ALSVID Shop** | 自建商城（整合于官网） | 消费者 / 买家 | 当前购物袋与消费者交易体验整合在 ALSVID Official；首期不部署独立公开 Shop 站点，也不默认依赖 Shopify。旧交易方案以 ADR 0005 为准。 |
| **ALSVID Admin** | 内部运营中心 | 内部员工 | 产品、订单、生产、库存、经销商、客户、售后、供应链、数据和系统管理 |
| **ALSVID Dealer Portal** | 经销商平台 | 经销商 / B2B 客户 | 经销商登录、采购、订单、合作与服务入口 |
| **My ALSVID** | 车主中心 / 我的车库 | 车主 / 会员 | 我的车辆、注册、保修、维修、服务记录与会员能力 |
| **ALSVID Service** | 售后服务入口 | 消费者 / 经销商 / 服务人员 | 保修、维修、售后申请与服务导航入口；是否独立部署以实际实现为准 |

## 2. Names that are not canonical

以下名称可以用于普通英文描述，但**不再作为 ALSVID 正式产品/系统名称**：

- `ALSVID WWW`（历史项目名；现正式名称为 `ALSVID Official`）
- `Internal Admin`
- `ALSVID Backend`
- `Official Website`（可以作为描述语，但不是系统名）
- `Dealer Portal`（单独出现时应优先写完整名称 `ALSVID Dealer Portal`）

## 3. Official naming rule

`ALSVID Official` 是架构、代码、部署和文档中的官网系统名称。

消费者真正打开官网时，品牌展示仍然是：

```text
ALSVID
```

页面导航、Logo 和品牌文案不显示 `ALSVID Official`。`Official` 用于区分官网项目与 Admin、Dealer Portal、My ALSVID；`www` 仍可作为域名和既有资源技术标识。

正式品牌域名规范结构为：

```text
www.alsvidbike.com
my.alsvidbike.com
admin.alsvidbike.com
dealer.alsvidbike.com
service.alsvidbike.com
```

`chaibenn.com` 为历史迁移域名；新链接统一使用 `alsvidbike.com`。DNS、TLS、Cloud Run 与认证/邮件配置必须单独验证，不能仅凭代码或文档宣称已上线。文档中的固定命名不代表每个 DNS、TLS 或业务闭环已经完成上线。

## 4. Environment names

ALSVID 环境名称固定为：

| Environment | 中文 | 规则 |
| --- | --- | --- |
| **ALSVID Production** | 正式 / 生产环境 | 正式业务运行；唯一的活动环境 |

不使用 `Staging`。历史上的 `ALSVID Development`（开发 / 测试环境）已退役；本地开发与 CI 仅用于验证，不构成独立环境。

简写 `dev` / `prod` 只允许用于资源名、脚本、变量或部署标识；面向人员和 UI 的完整名称仍使用 `ALSVID Production`。

## 5. Deployment/resource naming

后续拆分独立 Web surface 时，资源命名优先采用：

```text
alsvid-www-prod
alsvid-admin-prod
alsvid-dealer-prod
alsvid-my-prod
```

商城当前整合在 ALSVID Official，不要求创建 `alsvid-shop-prod` 或独立 Shopify 商店；Service 是否建立独立资源，以实际实现为准。资源名只是约定目标；只有真实资源被创建并验证后，才可以声称已经部署。

## 6. Product surface boundary

```text
ALSVID
│
├── ALSVID Official
│   ├── Brand / Content
│   ├── Bicycle / Accessories
│   └── Product catalogue / preview cart / My / Dealer / Service
│
├── ALSVID Commerce (within ALSVID Official)
│   └── First-party product / cart / order orchestration; PSP handles payment when approved
│
├── ALSVID Admin
│   └── Internal operations
│
├── ALSVID Dealer Portal
│   └── Dealer / B2B self-service
│
├── My ALSVID
│   └── Owner / member self-service
│
└── ALSVID Service
    └── After-sales / warranty / repair entry
```

核心自研前端项目仍按既定四项目管理：ALSVID Official、ALSVID Admin、ALSVID Dealer Portal、My ALSVID。当前商城整合在 ALSVID Official 内，不建立独立公开 Shop 项目或默认 Shopify 交易依赖；Service 是正式服务入口，是否独立部署以实际实现为准。

## 7. Commerce and external-channel boundary

ALSVID Official 的首期 B2C 商品选择、购物袋、结账编排与订单由 ALSVID Commerce 负责；获批的第三方 PSP 执行支付。Shopify 不是首期依赖，任何未来 Shopify 或其他外部销售渠道都必须经负责人单独批准，并明确身份、订单与库存事实的权威边界。

```text
Visitor / Customer
       ↓
   ALSVID Official
       ↓
Product / Variant / preview cart
       ↓
   ALSVID Commerce
       ↓
Approved PSP (payment stays disabled until launch gate)
       ↓
ALSVID order / payment facts, with auditable provider references
```

不存储银行卡完整卡号或安全码，不以浏览器跳转或前端状态认定付款成功；真实结账、收款与库存预留必须通过 ADR 0005 的发布门禁。

## 8. Canonical entrypoints

正式入口固定如下：

| 入口 | 固定地址 | 主要能力 |
| --- | --- | --- |
| **ALSVID Official** | `https://www.alsvidbike.com` | 品牌、产品、内容与消费者主入口 |
| **ALSVID Shop** | 官网内商城体验；暂不启用独立 Shop 域名 | 消费者 / 买家 | 交易与支付按当前商务决策配置；历史 Shopify 规划不代表已接通 |
| **My ALSVID** | `https://my.alsvidbike.com` | 我的车辆、车辆注册、VIN、保修、维修、服务、账户 |
| **ALSVID Admin** | `https://admin.alsvidbike.com` | 内部工作台、产品、订单、生产、库存、经销商、客户、售后、供应链、数据、设置 |
| **ALSVID Dealer Portal** | `https://dealer.alsvidbike.com` | 经销商工作台、产品、采购、B2B 订单、交付车辆、售后、账户 |
| **ALSVID Service** | `https://service.alsvidbike.com` | 售后、保修、维修与服务入口 |

官网中的入口关系固定为：

```text
ALSVID Official
├── 自行车
├── 配件
├── 服务 → ALSVID Service
├── 关于我们
├── 经销商合作 / 经销商登录 → ALSVID Dealer Portal
├── 购买 → ALSVID Official 产品中心 / ALSVID Commerce
└── 登录 / 我的车库 → My ALSVID
```

`ALSVID Admin` 不作为普通消费者导航入口，不在 ALSVID Official 主导航中公开展示。

## 9. Environment surface matrix

当前四个核心自研 surface 保持相同产品名称；商城整合在 Official 内，Service 是正式服务入口目标；Supplier Portal 是后续交付目标。

```text
ALSVID Production
├── ALSVID Official
├── ALSVID Official（含 ALSVID Commerce）
├── ALSVID Admin
├── ALSVID Dealer Portal
├── My ALSVID
└── ALSVID Service
```

开发在本地，自动检查在临时 GitHub CI 完成；正式业务运行在 `ALSVID Production`。旧共享云端 `ALSVID Development` 已退役。

## 10. Preferred domain mapping

新的生产跨门户链接统一指向以下规范入口：

```text
www.alsvidbike.com      → ALSVID Official
my.alsvidbike.com       → My ALSVID
admin.alsvidbike.com    → ALSVID Admin
dealer.alsvidbike.com   → ALSVID Dealer Portal
service.alsvidbike.com  → ALSVID Service
```

这些是**固定的规范命名与路由约定**，不是当前每个 DNS、证书或云资源已配置完成的声明。真实上线前仍需完成域名所有权、DNS、TLS、Cloud Run 路由与认证/邮件配置的实际验证。

## 11. Cloud Run canonical URL rule

Cloud Run 的 `*.run.app` 地址仅作为技术服务地址，不是用户正式入口。

生产环境中的登录、Session、密码重置、验证码、邀请、邮箱验证、Auth Callback 和跨门户跳转均应使用对应 `*.alsvidbike.com` 固定域名。Admin 的 canonical auth origin 固定为 `https://admin.alsvidbike.com`，不得将任一 Web `run.app` 地址写入用户邮件或前端正式跳转。

## 12. Change control

本命名规则起源于 Issue #116，并由 Issue #118 补充固定系统入口与域名映射。当前不把 `shop.alsvidbike.com` 作为独立公开入口；商城体验由官网承载，交易与支付路线按最新商务决策实施。`service.alsvidbike.com` 是售后服务入口目标，不代表已完成独立部署。

后续任何新页面、部署、README、架构图、Issue、PR 和 AI/Codex 工作：

1. 优先使用本文正式名称；
2. 不因聊天窗口变化重新命名；
3. 不把 ALSVID Official 与 ALSVID Admin 合并成同一个产品概念；
4. 门户地址和当前环境状态以 `PORTAL_DOMAINS.md`、`ENVIRONMENT_ARCHITECTURE.md` 为准，不复活历史 Development 资源；
5. 不把 Cloud Run `run.app` 地址作为正式用户入口；
6. 如果确实需要改名或改变域名结构，必须先更新本文并说明迁移影响。

> 当前域名说明：新链接的规范目标为 `alsvidbike.com`；`chaibenn.com` 是历史迁移域名。新域名的 DNS、TLS、服务绑定、认证和邮件配置须通过生产验收后才能视为正式切换完成。

## 13. Admin 应用切换器与场景名称

Admin 顶部右侧采用应用切换器（App Switcher），按钮建议为 `ALSVID Apps`；入口显示为 **官网、商城、车主中心、经销商平台、售后服务**。官网与商城入口都进入 ALSVID Official 的相应产品中心/购物袋；其余入口分别跳转 My ALSVID、ALSVID Dealer Portal、ALSVID Service，在新标签打开并保留当前 Admin 状态。

My ALSVID 的消费者车辆资产区域可使用“我的车库”；内部员工入口使用“车主中心”。项目名称与入口显示名称分开维护。目标项目仍独立检查访问权限，跨应用跳转不等于角色切换。完整规范及实施状态边界见 [APP_ENTRY_ARCHITECTURE.md](APP_ENTRY_ARCHITECTURE.md)。
