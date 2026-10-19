# ALSVID 门户地址规范

> 当前使用 `chaibenn.com` 作为临时域名。`alsvid.com` 为未来品牌域名，取得后沿用同一门户结构。
>
> **B2C 交易方向更新（ADR 0005）：** 首期官网自行承载商城、结账准备与订单流程，支付使用待选第三方支付机构；`shop.chaibenn.com` 为历史 Shopify 规划域名，不是当前必需的付款入口，也不得声称已经接通。

> 本文是 ALSVID 生产访问入口的唯一地址约定。后续页面、登录跳转、部署配置和文档统一使用以下地址，不再使用 Cloud Run `run.app` 地址作为用户入口。

## 1. 生产环境固定入口

| 入口 | 固定地址 | 业务边界 |
|---|---|---|
| ALSVID WWW / Official | https://www.chaibenn.com | 品牌官网、产品展示与消费者主入口 |
| ALSVID Shop（历史预留） | https://shop.chaibenn.com | 历史 Shopify 规划域名，首期不依赖、不标记已上线；消费者购物体验在 WWW 自建 |
| My ALSVID | https://my.chaibenn.com | 消费者车主中心、车辆、VIN、保修与售后 |
| ALSVID Admin | https://admin.chaibenn.com | ALSVID 公司内部运营后台；Admin 唯一正式登录入口 |
| ALSVID Dealer Portal | https://dealer.chaibenn.com | 经销商 / B2B 客户自助门户 |
| ALSVID Service | https://service.chaibenn.com | 售后、维修、保修与服务入口 |
| Supplier Portal（尚未交付） | https://supplier.chaibenn.com | 供应商自助协同，按 #185 分阶段启用 |

## 2. 项目与入口关系

当前核心前端项目仍按既定边界管理：ALSVID Official、ALSVID Admin、ALSVID Dealer Portal、My ALSVID。

`shop.chaibenn.com` 是历史预留域名，不再作为首期正式 Shopify 商城入口；`service.chaibenn.com` 是服务入口，可根据后续实现跳转或承载独立服务界面。是否拆分独立部署，以实际实现与验收为准。

## 3. 本地开发与历史地址

开发在本地，CI 使用临时容器/数据库，不维持共享云端 Development/Test。旧 `www.dev`、`admin.dev`、`dealer.dev`、`my.dev.chaibenn.com` 仅为历史命名，不是现行测试入口，不据此恢复资源。

Cloud Run 的 `*.run.app` 地址属于技术服务地址，不作为正式用户登录、密码重置、邀请邮件或跨门户导航地址。

## 4. 统一规则

- 官网固定使用 `https://www.chaibenn.com`。
- Shopify 商城固定使用 `https://shop.chaibenn.com`。
- Admin 固定使用 `https://admin.chaibenn.com`，认证、Session、密码重置、邀请和回调不得使用 `run.app` 地址。
- Dealer 固定使用 `https://dealer.chaibenn.com`。
- My ALSVID 固定使用 `https://my.chaibenn.com`。
- Service 固定使用 `https://service.chaibenn.com`。
- Supplier 预留 `https://supplier.chaibenn.com`，未完成交付前不得标记为已上线。
- 所有跨门户跳转使用上述固定域名，不使用 Cloud Run 临时地址作为长期入口。
- 本地/CI 和 Production 隔离数据、存储与凭据；入口数量不要求增加云环境。

## 5. 当前上线状态

地址命名已经固定。自定义域名是否可以访问，以 DNS、TLS 证书和对应门户服务完成绑定为准。

当前仓库中：

- 2026-10-16 只读核对：Admin `https://admin.chaibenn.com/login?portal=admin` 与 `/reset-password` 返回 200。其 `AUTH_BASE_URL` 使用正式域名。
- Web 默认 `run.app` URL 已关闭，两个旧 Web 地址返回 404 属于预期；登录、邮件和邀请不再使用这些地址。API 技术地址不因 Web 入口关闭而被一并禁用。
- `www`、`shop`、`dealer`、`my`、`service`、`supplier` 的真实 DNS/TLS 与业务闭环，必须分别按实际配置和验收证据登记；文档固定命名不等于已经上线。
- 在对应服务和 DNS 完成前，不把规划地址标记为“已上线”。

## 6. 访问入口原则

后续对外/内部说明统一使用：

- 官网：www.chaibenn.com
- 商城：shop.chaibenn.com
- 我的车库：my.chaibenn.com
- 内部后台：admin.chaibenn.com
- 经销商：dealer.chaibenn.com
- 售后服务：service.chaibenn.com

Supplier 入口只有在完成 #185 对应验收后开放；本地开发与临时 CI 不冒用生产数据。完整证据与限制见[实施台账](PORTAL_DELIVERY_PLAN_2026-10-16.md)。
