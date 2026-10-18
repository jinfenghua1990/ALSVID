# ALSVID Admin 真实业务 UI 接入记录（PR #211，待验收）

> 仅代表该 Draft PR 的代码提交，不代表已合并、生产发布或全系统完成；以 GitHub CI 和生产业务验收分别记录状态。
> 承接 [Admin 缺口台账](ALSVID-ADMIN-ARCHITECTURE-AND-GAP-REGISTER-2026-10-16.md) 与 [Issue #212](https://github.com/jinfenghua1990/ALSVID/issues/212)。

## 一、统一 UI，不新建业务真相

- **统一入口：** `/admin`；顶部一级导航，业务模块左侧二级导航。
- **数据权威：** 原有 `apps/api/src/*.controller.ts` + `domains/*` + `packages/*`；保持现有数据库和领域业务不变量。
- **复用业务 UI：** 六个现有工作台使用 `OperationsFrame` 在旧路由显示原 AppShell、在 `/admin/*` 使用 `embedded` 模式挂入新 Admin。没有复制业务逻辑到 fixture renderer。
- **设计资料：** 原 Ardot 85 个页面和流程状态不删除；六个模块首页默认显示可读写的真实业务组件，旧画板折叠为“设计预览”。详情和示例流程仍标示 fixture，没有 API 写入的功能不得显示“已保存”。
- **后向兼容：** `/product`、`/commerce`、`/production`、`/inventory`、`/dealers`、`/supply` 保持有效，并由服务端 Admin 守卫保护。

| 模块 | 规范入口 | 重用原有业务组件 | 原有数据接口 |
| --- | --- | --- | --- |
| 产品 | `/admin/product` | `product/product-client.tsx` | `/v1/product`, `/v1/engineering` |
| 订单 | `/admin/orders` | `commerce/commerce-client.tsx` | `/v1/commerce`, `/v1/integrations` |
| 生产 | `/admin/production` | `production/production-client.tsx` | `/v1/production`, `/v1/vehicles` |
| 库存 | `/admin/inventory` | `inventory/inventory-client.tsx` | `/v1/inventory`, `/v1/warehouse` |
| 经销商 | `/admin/dealers` | `dealers/dealers-client.tsx` | `/v1/dealers`, `/v1/partners` |
| 供应链 | `/admin/supply` | `supply/supply-client.tsx` | `/v1/procurement` |

## 二、身份安全

- 旧的 13 组业务工作台已添加服务端 `requirePortalSession('admin', ...)`；API 仍需各自做业务动作授权，不能把页面登录当作业务授权。
- `ALSVID_PASSWORD_LOGIN_ENABLED` **默认关闭**。Web 端隐藏并拒绝账户密码登录，API 层也拒绝；源码不删除，将来重新开启必须两个服务明确设 `true` 并完成管理员与经销商的登录回归。
- 邮箱验证码登录和首次账户密码初始化沿用原机制。这不代表生产邮件投递已在本 PR 重新实测。
- `/admin` 中的退出按钮使用现有会话注销 API；没有后台能力的搜索、通知、主题按钮继续禁用。

## 三、未完成与验收门槛

1. 85 个画面的详情、审批、生产计划向导、调拨与售后仍需逐页替换 fixture 行为；只实现页面绝不等于业务闭环。
2. 客户、售后、数据/报表和权限管理目前多数仍是骨架；必须增加真服务、权限、审计、错误恢复，不能写演示成功。
3. 外部 Shopify、WMS、Dealer/Supplier/My 仍按本仓库原始业务和身份边界实施，不得复制外部订单、仓储、结账系统。
4. 尚需真实浏览器验证 1440px / 390px 页面交互、表格溢出、表单提交和失败提示；至少验证一条真实非生产的 FC1→BOM→生产→QC→VIN→库存链路。
5. 合并与正式发布需要当前 head CI 的 verify 和 containers 成功、代码审查及生产发布记录。**此 PR 始终保持 Draft，未经过验收不可设 Ready**。

## 四、代码位置

- `apps/web/app/_design/integrated-operations.tsx`
- `apps/web/app/_components/operations-frame.tsx`
- `apps/web/app/_design/renderer.tsx`
- `apps/web/app/_design/live-operations.tsx`, `live-operations.json`
- `apps/web/app/_design/integrated-operations.test.mjs`, `live-operations.test.mjs`, `login-policy.test.mjs`
- `apps/web/app/login/page.tsx`, `apps/web/app/_components/portal-login.tsx`, `apps/web/app/api/session/login/route.ts`
- `apps/api/src/auth.controller.ts`


## 五、第三批：客户档案 / 身份审计真实查询（本 PR 新增，待验收）

| 模块 | 新版页面 | 真实读取 | 明确不做 |
| --- | --- | --- | --- |
| 客户/车主 | \`/admin/customers\` | \`GET /v1/partners\` 中的 CUSTOMER 角色档案，\`GET /v1/partners/:id\` 明细；\`GET /v1/vehicles\` 车辆出生台账 | **不**把 Partner 邮箱/角色匹配当作 Shopify 客户验证；**不**自动关联车辆所有权、保修或交付事实 |
| 设置/审计 | \`/admin/settings\` | \`GET /v1/auth/users\` 内部账号与角色，\`GET /v1/audit?limit=100\` 已保存审计事件 | **不**在 UI 修改角色、创建用户或伪造日志；只读接口仍按 \`identity.user.read\` 和 \`audit.read\` 等后端权限执行 |

- 页面采用真实记录、加载、失败、无权限和空状态；接口返回 403 不伪装为 0 条数据。
- 客户筛选与档案详情是查询功能，不代表已实现客户售后/车主所有权；车辆台账最多展示前 100 条，服务端车辆列表当前最多 1000 条。
- **售后未闭环**：尚无已交付的 Service/Warranty/Repair Controller 与持久化领域流程，不将 UI 假操作挂接到订单/车辆写入；需要单独设计授权、业务状态机、审计和 API 验收后再开放。
- 账户列表和审计事件仅在有权限的 Admin 页面读取，审计元数据不直接渲染；不对消费者/Dealer/Supplier 开放。
- 第三批前端：\`apps/web/app/_design/admin-records.tsx\`、\`admin-records.module.css\`、\`admin-records.test.mjs\`；通过 \`integrated-operations.tsx\` 复用既有 Admin 布局。

注意：以上均为 Draft PR 中的新增代码，当前 CI 结果、正式发布和真实非生产业务浏览器验证须分别记录。合并后再按 Issue #212 分拆售后、权限变更、客户车辆归属与数据口径的独立工作。
