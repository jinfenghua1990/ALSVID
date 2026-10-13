# ALSVID 四大门户地址规范

> 当前使用 `chaibenn.com` 作为临时域名。`alsvid.com` 为未来品牌域名，取得后沿用同一门户结构。

> 本文是 ALSVID 四大门户的唯一地址约定。后续页面、登录跳转、部署配置和文档统一使用以下地址，不再另行命名。

## 1. 生产环境

| 门户 | 固定地址 | 业务边界 |
|---|---|---|
| ALSVID Official | https://www.chaibenn.com | 品牌官网与 Shopify 商城前端 |
| ALSVID Admin | https://admin.chaibenn.com | ALSVID 公司内部运营后台 |
| ALSVID Dealer Portal | https://dealer.chaibenn.com | 经销商 / B2B 客户自助门户 |
| My ALSVID | https://my.chaibenn.com | 消费者车主中心、车辆、VIN、保修与售后 |

## 2. 开发环境

| 门户 | 固定地址 |
|---|---|
| ALSVID Official | https://www.dev.chaibenn.com |
| ALSVID Admin | https://admin.dev.chaibenn.com |
| ALSVID Dealer Portal | https://dealer.dev.chaibenn.com |
| My ALSVID | https://my.dev.chaibenn.com |

## 3. 统一规则

- https://www.chaibenn.com 同时承载品牌官网与 Shopify 商城前端，不再单独建立 shop.chaibenn.com。
- admin、dealer、my 分别对应独立门户，不混用内部 Portal Launcher。
- 开发环境只使用 *.dev.chaibenn.com，生产环境只使用 *.chaibenn.com。
- 开发与生产保持相同的页面结构、登录方式和业务流程，只隔离数据、存储、密钥和部署资源。
- 所有跨门户跳转必须使用上述固定域名，不使用 Cloud Run 临时地址作为长期入口。

## 4. 当前上线状态

地址命名已经固定。自定义域名是否可以访问，以 DNS、TLS 证书和对应门户服务完成绑定为准。

当前仓库中：

- ALSVID Admin 已有可运行的 Cloud Run 服务，正式和开发临时地址已验证。
- ALSVID Official 的正式入口需要绑定官网 / Shopify。
- Dealer Portal 和 My ALSVID 需要完成各自门户服务后，再绑定对应域名。
- 在对应服务和 DNS 完成前，不把规划地址标记为“已上线”。

## 5. 访问入口原则

后续对外说明统一使用：

- 官网：www.chaibenn.com
- 内部后台：admin.chaibenn.com
- 经销商：dealer.chaibenn.com
- 车主中心：my.chaibenn.com

开发测试统一在对应的 .dev.chaibenn.com 地址进行。
