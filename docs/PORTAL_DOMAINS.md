# ALSVID 门户地址规范

> 当前使用 `chaibenn.com` 作为临时域名。`alsvid.com` 为未来品牌域名，取得后沿用同一门户结构。

> 本文是 ALSVID 四大门户的唯一地址约定。后续页面、登录跳转、部署配置和文档统一使用以下地址，不再另行命名。

## 1. 生产环境

| 门户 | 固定地址 | 业务边界 |
|---|---|---|
| ALSVID Official | https://www.chaibenn.com | 品牌官网与 Shopify 商城前端 |
| ALSVID Admin | https://admin.chaibenn.com | ALSVID 公司内部运营后台 |
| ALSVID Dealer Portal | https://dealer.chaibenn.com | 经销商 / B2B 客户自助门户 |
| My ALSVID | https://my.chaibenn.com | 消费者车主中心、车辆、VIN、保修与售后 |
| Supplier Portal（尚未交付） | https://supplier.chaibenn.com | 供应商自助协同，按 #185 分阶段启用 |

## 2. 本地开发与历史地址

开发在本地，CI 使用临时容器/数据库，不维持共享云端 Development/Test。旧 `www.dev`、`admin.dev`、`dealer.dev`、`my.dev.chaibenn.com` 仅为历史命名，不是现行测试入口，不据此恢复资源。

## 3. 统一规则

- https://www.chaibenn.com 同时承载品牌官网与 Shopify 商城前端，不再单独建立 shop.chaibenn.com。
- admin、dealer、my 分别对应独立门户，不混用内部 Portal Launcher。
- 本地/CI 和 Production 隔离数据、存储与凭据；门户数量不要求增加云环境。
- 所有跨门户跳转必须使用上述固定域名，不使用 Cloud Run 临时地址作为长期入口。

## 4. 当前上线状态

地址命名已经固定。自定义域名是否可以访问，以 DNS、TLS 证书和对应门户服务完成绑定为准。

当前仓库中：

- 2026-10-16 只读核对：Admin `https://admin.chaibenn.com/login?portal=admin` 与 `/reset-password` 返回 200。其 `AUTH_BASE_URL` 使用正式域名。
- Web 默认 `run.app` URL 已关闭，两个旧 Web 地址返回 404 属于预期；登录、邮件和邀请不再使用这些地址。API 技术地址不因 Web 入口关闭而被一并禁用。
- 本轮未验证 ALSVID Official 的独立 DNS/TLS、Shopify 店铺与购买闭环，按实际配置和验收证据登记。
- Dealer、My、Supplier 仍须验证各自身份、组织/车辆范围、真实业务与域名；源代码中有路由不等于独立上线。
- 在对应服务和 DNS 完成前，不把规划地址标记为“已上线”。

## 5. 访问入口原则

后续对外说明统一使用：

- 官网：www.chaibenn.com
- 内部后台：admin.chaibenn.com
- 经销商：dealer.chaibenn.com
- 车主中心：my.chaibenn.com

Supplier 入口只有在完成 #185 对应验收后开放；本地开发与临时 CI 不冒用生产数据。完整证据与限制见[实施台账](PORTAL_DELIVERY_PLAN_2026-10-16.md)。
