# ALSVID System Naming

> Status: **Frozen / 已确认**
>
> 本文是 ALSVID 对外网站、内部系统、经销商门户、车主门户以及部署命名的权威规则。后续文档、代码、UI、部署和沟通默认使用本文命名；除非有新的明确架构决策，否则不再重新命名。

## 1. Canonical product names

| Canonical name | 中文定义 | 主要对象 | 说明 |
| --- | --- | --- | --- |
| **ALSVID Official** | ALSVID 官网 / 官网商城 | 消费者、访客 | 品牌官网、产品展示、内容、服务入口及 Shopify 商城承载面 |
| **ALSVID Admin** | 内部运营中心 | 内部员工 | 产品、订单、生产、库存、经销商、客户、售后、供应链、数据和系统管理 |
| **ALSVID Dealer Portal** | 经销商平台 | 经销商 / B2B 客户 | 经销商登录、采购、订单、合作与服务入口 |
| **My ALSVID** | 车主中心 / 我的车库 | 车主 / 会员 | 我的车辆、注册、保修、维修、服务记录与会员能力 |

## 2. Names that are not canonical

以下名称可以用于普通英文描述，但**不再作为 ALSVID 正式产品/系统名称**：

- `ALSVID WWW`（历史项目名；现正式名称为 `ALSVID Official`）
- `Internal Admin`
- `ALSVID Backend`
- `Official Website`（可以作为描述语，但不是系统名）
- `Dealer Portal`（单独出现时应优先写完整名称 `ALSVID Dealer Portal`）

## 3. Official naming rule

`ALSVID Official` 是架构、代码、部署和文档中的系统名称。

消费者真正打开官网时，品牌展示仍然是：

```text
ALSVID
```

页面导航、Logo 和品牌文案不显示 `ALSVID Official`。`Official` 用于区分官网项目与 Admin、Dealer Portal、My ALSVID；`www` 仍可作为域名和既有资源技术标识。

未来正式域名优先对应：

```text
www.chaibenn.com
```

最终域名是否启用以真实域名配置为准；文档中的域名示例不代表已经完成 DNS 或生产部署。

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
alsvid-www-dev
alsvid-www-prod

alsvid-admin-dev
alsvid-admin-prod

alsvid-dealer-dev
alsvid-dealer-prod

alsvid-my-dev
alsvid-my-prod
```

资源名只是约定目标；只有真实资源被创建并验证后，才可以声称已经部署。

## 6. Product surface boundary

```text
ALSVID
│
├── ALSVID Official
│   ├── Brand / Content
│   ├── Bicycle / Accessories
│   ├── Service entry
│   └── Shopify commerce surface
│
├── ALSVID Admin
│   └── Internal operations
│
├── ALSVID Dealer Portal
│   └── Dealer / B2B self-service
│
└── My ALSVID
    └── Owner / member self-service
```

四者是独立前端项目，不是同一系统页面或 Admin 内部模块。大部分关系为跨应用跳转，通过统一身份认证和部分数据联动协作；可以共享 API、Identity、Domain 和基础设施，但用户界面和权限边界必须明确分开。

## 7. Shopify boundary

Shopify 是 `ALSVID Official` 的交易基础之一，不替代 ALSVID Admin、ALSVID Dealer Portal 或 My ALSVID。

```text
Visitor / Customer
       ↓
   ALSVID Official
       ↓
Product / Cart / Purchase
       ↓
     Shopify
       ↓
必要交易事实通过 integration 同步到 ALSVID
```

ALSVID 不重复实现 Shopify 自己负责的 checkout、支付捕获和平台履约编排。

## 8. Canonical entrypoints

四个系统入口固定如下：

| 系统 | 面向对象 | 主要入口能力 | 访问级别 |
| --- | --- | --- | --- |
| **ALSVID Official** | 所有人 | 品牌、产品、配件、服务、购买、登录入口 | 公开 |
| **My ALSVID** | 消费者 / 车主 | 我的车辆、车辆注册、保修、维修、服务、账户 | 登录后 |
| **ALSVID Dealer Portal** | 经销商 / B2B 客户 | 经销商工作台、产品、采购、B2B 订单、交付车辆、售后、账户 | 经销商登录后 |
| **ALSVID Admin** | 内部员工 | 工作台、产品、订单、生产、库存、经销商、客户、售后、供应链、数据、设置 | 内部登录后 |

官网中的入口关系固定为：

```text
ALSVID Official
├── 自行车
├── 配件
├── 服务
├── 关于我们
├── 经销商合作
├── 购买 → Shopify
├── 登录 → My ALSVID
└── 经销商登录 → ALSVID Dealer Portal
```

`ALSVID Admin` 不作为普通消费者导航入口，不在 ALSVID Official 主导航中公开展示。

## 9. Environment surface matrix

当前四个核心 surface 保持相同产品名称；Supplier Portal 是后续交付目标。以下开发名称仅为历史，不是要求恢复共享云环境：

```text
ALSVID Development
├── ALSVID Official
├── ALSVID Admin
├── ALSVID Dealer Portal
└── My ALSVID

ALSVID Production
├── ALSVID Official
├── ALSVID Admin
├── ALSVID Dealer Portal
└── My ALSVID
```

开发在本地，自动检查在临时 GitHub CI 完成；正式业务运行在 `ALSVID Production`。旧共享云端 `ALSVID Development` 已退役。

## 10. Preferred domain mapping

未来正式域名优先使用：

```text
www.chaibenn.com      → ALSVID Official
my.chaibenn.com       → My ALSVID
dealer.chaibenn.com   → ALSVID Dealer Portal
admin.chaibenn.com    → ALSVID Admin
```

历史 Development 域名（不再作为现行测试入口）：

```text
www.dev.chaibenn.com      → ALSVID Official / Development
my.dev.chaibenn.com       → My ALSVID / Development
dealer.dev.chaibenn.com   → ALSVID Dealer Portal / Development
admin.dev.chaibenn.com    → ALSVID Admin / Development
```

这些是**固定的目标命名与路由约定**，不是当前 DNS、证书或云资源已配置完成的声明。真实上线前仍需完成域名所有权、DNS、TLS、Cloud Run / Shopify 路由等实际配置与验证。

## 11. Change control

本命名规则起源于 Issue #116，并由 Issue #118 补充固定系统入口与域名映射。2026-10-14 按最新明确确认更新：官网正式项目名由 ALSVID WWW 改为 ALSVID Official；既有 www 域名、资源名和部署标识保持技术含义，不自动重命名。

后续任何新页面、部署、README、架构图、Issue、PR 和 AI/Codex 工作：

1. 优先使用本文正式名称；
2. 不因聊天窗口变化重新命名；
3. 不把 ALSVID Official 与 ALSVID Admin 合并成同一个产品概念；
4. 门户地址和当前环境状态以 `PORTAL_DOMAINS.md`、`ENVIRONMENT_ARCHITECTURE.md` 为准，不复活历史 Development 资源；
5. 如果确实需要改名或改变域名结构，必须先更新本文并说明迁移影响。


> 当前域名说明：现阶段使用 `chaibenn.com` 临时承载四大门户；`alsvid.com` 为未来正式品牌域名目标，系统结构不变。

## 12. Admin 应用切换器与场景名称

Admin 顶部右侧采用应用切换器（App Switcher），按钮建议为 `ALSVID Apps`；入口显示为 **官网、车主中心、经销商平台**，分别跳转 ALSVID Official、My ALSVID、ALSVID Dealer Portal，在新标签打开并保留当前 Admin 状态。

My ALSVID 的消费者车辆资产区域可使用“我的车库”；内部员工入口使用“车主中心”。项目名称与入口显示名称分开维护。目标项目仍独立检查访问权限，跨应用跳转不等于角色切换。完整规范及实施状态边界见 [APP_ENTRY_ARCHITECTURE.md](APP_ENTRY_ARCHITECTURE.md)。
