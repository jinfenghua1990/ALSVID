# ALSVID 门户地址规范

> **正式域名规范：** 新的生产跨门户链接统一使用 `alsvid.com`。旧 `chaibenn.com` 仅作为历史/迁移域名，不再由生产页面为新链接生成。
>
> **上线状态说明：** 本次修复统一代码路由和文档目标；DNS、TLS 证书、Cloud Run 自定义域名绑定、生产环境变量及邮件发件域名尚需通过实际配置与浏览器检查确认。文档中的目标地址不等于已经完成生产切换。

## 1. 正式门户地址

| 入口 | 规范地址 | 业务边界 |
|---|---|---|
| ALSVID Official / 官网 | https://www.alsvid.com | 品牌官网、产品展示和消费者入口 |
| My ALSVID / 车主中心 | https://my.alsvid.com | 车主账户、车辆、VIN、保修与售后 |
| ALSVID Admin | https://admin.alsvid.com | 公司内部运营后台 |
| ALSVID Dealer Portal | https://dealer.alsvid.com | 经销商 / B2B 客户自助门户 |
| ALSVID Service | https://service.alsvid.com | 售后、维修、保修与服务入口 |
| Supplier Portal | https://supplier.alsvid.com | 供应商自助协同；完成独立交付与验收后再开放 |
| Shop 子域 | 暂不作为独立公开入口 | 当前官网商城/支付路线按最新商务决策执行，不因保留历史 Shopify 规划而自动启用独立 Shop 站点 |

## 2. 路由规则

- 官网、车主中心、管理后台、经销商门户和售后入口的正式主域统一为 `alsvid.com`。
- 即使访客从旧 `chaibenn.com` 域名进入，生产页面生成的新跨门户链接也应指向对应的 `*.alsvid.com` 地址。
- 本地开发使用当前应用的本地路径，不把本地导航送到旧生产域名或不相关的生产门户。
- 历史 `*.dev.chaibenn.com` 仅用于解释旧记录；共享云端 Development/Test 已退役，不据此创建或恢复资源。
- Cloud Run 的 `*.run.app` 地址是技术服务地址，不作为正式用户登录、密码重置、邀请邮件或跨门户导航入口。
- `chaibenn.com` 如需继续保留，应由域名/边缘层配置旧地址到新地址的 HTTPS 301 跳转；该跳转不由本次前端链接修复自动建立。

## 3. 正式切换前必须验证的外部配置

1. 为 `www`、`my`、`admin`、`dealer` 和实际启用的 `service` 子域配置 DNS。
2. 将每个实际启用的主机名绑定到正确的 Cloud Run 服务，并确认 TLS 证书签发、HTTPS 可访问和健康检查正常。
3. 将生产 `AUTH_BASE_URL` 改为 `https://admin.alsvid.com`，并验证登录、密码重置、邀请及回调地址。
4. 在邮件服务验证 `alsvid.com` 发件域后，再把 `MAIL_FROM_ADDRESS` 切换为已验证的 `@alsvid.com` 地址。
5. 检查身份提供方的允许回调地址、Cookie 域策略和退出登录行为。旧域与新域之间不会自动共享 Host-only Cookie；切换后用户可能需要重新登录。
6. 在真实浏览器分别检查官网到 My、Dealer、Admin 的入口，确认不会回跳旧域、出现证书警告或登录循环。
7. 确认旧域跳转策略和回滚方式后，才把新域切换视为生产完成。

## 4. 当前状态

- 代码：门户链接生成逻辑已调整为规范 `alsvid.com` 域名；本地开发链接保持本地路径。
- 自动化：新增门户域名路由测试，覆盖旧生产域名、新规范域名和本地导航。
- 生产域名：**尚未在本次操作中验证 DNS、TLS、Cloud Run 绑定、生产变量或真实浏览器访问。** 在这些检查通过前，不应声称新域名已正式上线。
