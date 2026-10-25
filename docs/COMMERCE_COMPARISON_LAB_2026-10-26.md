# 商城方案独立比较区 — 2026-10-26

状态：隔离样机实现；不是 Medusa / CRMEB 生产接通或架构替换。

## 负责人请求与范围
负责人希望比较 Medusa 前台购买体验与 CRMEB 中文后台的组合，在 Admin 新建独立菜单，原系统保留用于比较。本变更新增 /admin/commerce-lab，复用现有 Admin 服务端守卫与界面框架，独立菜单位于“更多模块 → 商城方案对比”。

## 当前交付
- 现有系统入口：官网车型目录、电商运营与系统架构；没有复制实时业务数据。
- ALSVID 购买页面样机和 CRMEB 风格中文运营样机；不是两个开源项目的原生界面截图。
- 共享浏览器内存数据：示例商品改名、改价、上下架；购物袋、演示单和处理标记。
- 刷新清空；不使用现有购物袋 localStorage，不调用生产商品/客户/库存/订单/支付接口。
- 不采集客户地址或卡号；示例价格不是 ALSVID 获批售价。
- 无新增服务、数据库、凭据、供应商 SDK 或运行依赖。原有后台仅增加独立入口与可选内容插槽。

## 真正融合的后续工作
Medusa 当前 dtc-starter 的 storefront 使用 Medusa 后端契约。CRMEB 不能只替换 base URL 即用：需重写商品、变体、价格、购物车、订单、身份、支付与退款的数据调用，并校验版本和许可证。旧 nextjs-starter-medusa 已归档，后续不以其为新项目基础。

正式采用 CRMEB 后端（含 PHP/MySQL 等运行要求）前，单独记录 ADR：现有 ALSVID Commerce/Finance/Inventory 与候选引擎的数据权威、独立数据/账号/会话边界、适配层、部署及退出方式。禁止双写订单或让后台 UI 直接写原系统表。本次授权允许独立比较，不等于迁移生产数据或启用真实交易。ADR 0005/0006 门禁继续有效。

## 验证
由 PR 的既有 CI 运行 architecture/typecheck/test/build/container 检查；浏览器工作流验证管理员保护、模拟授权下的前台→演示单→后台闭环、商品联动、移动端与刷新隔离。不以测试认证 stub 证明生产登录完成。部署与实际 Admin 点击验收需各自记录真实证据。

来源：
- https://github.com/medusajs/dtc-starter
- https://github.com/medusajs/nextjs-starter-medusa
- https://github.com/crmeb/CRMEB
