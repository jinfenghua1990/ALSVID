# ALSVID System Naming

> Status: **Frozen / 已确认**
>
> 本文是 ALSVID 对外网站、内部系统、经销商门户、车主门户以及部署命名的权威规则。后续文档、代码、UI、部署和沟通默认使用本文命名；除非有新的明确架构决策，否则不再重新命名。

## 1. Canonical product names

| Canonical name | 中文定义 | 主要对象 | 说明 |
| --- | --- | --- | --- |
| **ALSVID WWW** | ALSVID 官方网站 / 官网商城 | 消费者、访客 | 品牌官网、产品展示、内容、服务入口及 Shopify 商城承载面 |
| **ALSVID Admin** | ALSVID 运营后台 | 内部员工 | 产品、订单、生产、库存、经销商、客户、售后、供应链、数据和系统管理 |
| **ALSVID Dealer Portal** | ALSVID 经销商门户 | 经销商 / B2B 客户 | 经销商登录、采购、订单、合作与服务入口 |
| **My ALSVID** | ALSVID 车主中心 | 车主 / 会员 | 我的车辆、注册、保修、维修、服务记录与会员能力 |

## 2. Names that are not canonical

以下名称可以用于普通英文描述，但**不再作为 ALSVID 正式产品/系统名称**：

- `ALSVID Official`
- `Internal Admin`
- `ALSVID Backend`
- `Official Website`（可以作为描述语，但不是系统名）
- `Dealer Portal`（单独出现时应优先写完整名称 `ALSVID Dealer Portal`）

## 3. WWW naming rule

`ALSVID WWW` 是架构、代码、部署和文档中的系统名称。

消费者真正打开官网时，品牌展示仍然是：

```text
ALSVID
```

页面导航、Logo 和品牌文案不显示 `ALSVID WWW`。`WWW` 只用于区分该应用与 Admin、Dealer Portal、My ALSVID。

未来正式域名优先对应：

```text
www.alsvid.com
```

最终域名是否启用以真实域名配置为准；文档中的域名示例不代表已经完成 DNS 或生产部署。

## 4. Environment names

ALSVID 环境名称固定为：

| Environment | 中文 | 规则 |
| --- | --- | --- |
| **ALSVID Development** | 开发 / 测试环境 | UI、功能、集成和发布前验收 |
| **ALSVID Production** | 正式 / 生产环境 | 正式业务运行 |

不使用 `Staging` 替代当前固定环境名称。

简写 `dev` / `prod` 只允许用于资源名、脚本、变量或部署标识；面向人员和 UI 的完整名称仍使用 `ALSVID Development` / `ALSVID Production`。

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
├── ALSVID WWW
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

四个 surface 可以共享 API、Identity、Domain 和基础设施，但用户界面和权限边界必须明确分开。

## 7. Shopify boundary

Shopify 是 `ALSVID WWW` 的交易基础之一，不替代 ALSVID Admin、ALSVID Dealer Portal 或 My ALSVID。

```text
Visitor / Customer
       ↓
   ALSVID WWW
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
| **ALSVID WWW** | 所有人 | 品牌、产品、配件、服务、购买、登录入口 | 公开 |
| **My ALSVID** | 消费者 / 车主 | 我的车辆、车辆注册、保修、维修、服务、账户 | 登录后 |
| **ALSVID Dealer Portal** | 经销商 / B2B 客户 | 经销商工作台、产品、采购、B2B 订单、交付车辆、售后、账户 | 经销商登录后 |
| **ALSVID Admin** | 内部员工 | 工作台、产品、订单、生产、库存、经销商、客户、售后、供应链、数据、设置 | 内部登录后 |

官网中的入口关系固定为：

```text
ALSVID WWW
├── 自行车
├── 配件
├── 服务
├── 关于我们
├── 经销商合作
├── 购买 → Shopify
├── 登录 → My ALSVID
└── 经销商登录 → ALSVID Dealer Portal
```

`ALSVID Admin` 不作为普通消费者导航入口，不在 ALSVID WWW 主导航中公开展示。

## 9. Environment surface matrix

Development 与 Production 都按同样的四个 surface 组织：

```text
ALSVID Development
├── ALSVID WWW
├── ALSVID Admin
├── ALSVID Dealer Portal
└── My ALSVID

ALSVID Production
├── ALSVID WWW
├── ALSVID Admin
├── ALSVID Dealer Portal
└── My ALSVID
```

开发、测试和验收在 `ALSVID Development` 完成；正式业务运行在 `ALSVID Production`。

## 10. Preferred domain mapping

未来正式域名优先使用：

```text
www.alsvid.com      → ALSVID WWW
my.alsvid.com       → My ALSVID
dealer.alsvid.com   → ALSVID Dealer Portal
admin.alsvid.com    → ALSVID Admin
```

Development 域名优先使用：

```text
www.dev.alsvid.com      → ALSVID WWW / Development
my.dev.alsvid.com       → My ALSVID / Development
dealer.dev.alsvid.com   → ALSVID Dealer Portal / Development
admin.dev.alsvid.com    → ALSVID Admin / Development
```

这些是**固定的目标命名与路由约定**，不是当前 DNS、证书或云资源已配置完成的声明。真实上线前仍需完成域名所有权、DNS、TLS、Cloud Run / Shopify 路由等实际配置与验证。

## 11. Change control

本命名规则从 Issue #116 起冻结，并由 Issue #118 补充固定系统入口与域名映射。

后续任何新页面、部署、README、架构图、Issue、PR 和 AI/Codex 工作：

1. 优先使用本文正式名称；
2. 不因聊天窗口变化重新命名；
3. 不把 ALSVID WWW 与 ALSVID Admin 合并成同一个产品概念；
4. 四个系统入口与 Development / Production 环境矩阵默认按本文执行；
5. 如果确实需要改名或改变域名结构，必须先更新本文并说明迁移影响。
