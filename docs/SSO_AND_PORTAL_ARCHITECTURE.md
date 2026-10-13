# ALSVID 统一后端与四门户登录架构

> 当前使用 `chaibenn.com` 临时域名；未来切换到 `alsvid.com` 时，SSO 结构不变。

## 固定架构

ALSVID 使用：

- 一个统一的 ALSVID API 后端
- 一个身份认证与会话中心
- 一个环境内的 PostgreSQL 数据中心
- 一个环境内的 R2 对象存储
- 四个独立前端门户

四个前端分别是：

- ALSVID WWW：官网与 Shopify 商城前端
- ALSVID Admin：公司内部运营后台
- ALSVID Dealer Portal：经销商 / B2B 门户
- My ALSVID：车主与车辆生命周期中心

前端可以独立部署、独立迭代，但不复制后端、数据库、认证或业务数据。

## 环境隔离

生产环境：

- Production API
- Production PostgreSQL
- Production R2
- 生产身份会话

开发环境：

- Development API
- Development PostgreSQL
- Development R2
- 开发身份会话

开发和生产保持相同的 API、认证和业务流程，但数据、密钥、存储和运行资源完全隔离。

## 单点登录

同一环境下，四个门户共享 ALSVID 会话：

- 生产门户 Cookie 作用域：.chaibenn.com
- 开发门户 Cookie 作用域：.dev.chaibenn.com
- 临时 Cloud Run 地址使用当前域名 Cookie，不影响开发验收
- Cookie 只保存短期会话令牌，不保存业务数据
- 每个门户进入页面时都通过统一 API 的 /v1/auth/me 验证会话
- 会话是否有权访问某个门户，由后端角色与权限判断
- 退出任意门户时，同时撤销后端会话并清除共享 Cookie

因此，用户在一个门户登录后，跳转到同一环境的其他门户不需要重复登录。

## 数据边界

- 产品、车辆、VIN、客户、经销商、保修、售后等 ALSVID 业务事实由统一 API 管理。
- Shopify 仍然负责商城交易、支付和订单主数据。
- WMS 仍然负责仓库执行数据。
- 各门户只展示与自身角色相关的数据，不直接连接数据库。
- 前端永远通过 API 访问数据，禁止前端直连 PostgreSQL 或 R2。

## 当前实施状态

- 统一 API 与身份认证已经存在。
- 共享门户会话 Cookie 策略已加入现有 Web 应用。
- 四门户独立前端仍按固定地址逐步拆分和部署。
- 自定义域名与 DNS 完成后，四个门户使用固定域名访问。
