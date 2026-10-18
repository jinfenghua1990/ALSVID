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


## 六、第四批：Service 领域的最小真实内部售后工单（Draft / 尚未业务验收）

- 新建完全封装的 \`@alsvid/service\` Domain（\`domains/service\`），遵守 core/application/infrastructure/api 结构；事实权威在 Service，不在 Vehicle 或 Inventory。
- \`0025_service_case_foundation.sql\`：新增 \`service.cases\`（车辆 FK、分类、问题标题、描述、状态、版本）及 append-only \`service.case_history\`，引入 \`service.read\` / \`service.write\` 两项权限；默认只允许实际具有内部身份 **且有权限** 的用户操作，system_admin / 内部 service_agent 经角色授权。
- \`POST /api/v1/service/cases\`：仅接受真实已出生车辆的 \`vehicleId\`，只建立内部售后记录，不自动建立客户/经销商所有权、保修承诺或付款事实。
- \`GET /api/v1/service/cases\`、\`GET /api/v1/service/cases/:id\`：读取最近记录、单据详情和不可变状态变更历史；每次处理都有版本、操作人及原因。
- \`POST /api/v1/service/cases/:id/transition\`：NEW → TRIAGED → IN_PROGRESS → RESOLVED → CLOSED；RESOLVED 可重新转回 IN_PROGRESS；CLOSED 终态；提供乐观锁 \`expectedVersion\`，并使用同一数据库事务记录状态历史与审计，不允许静默覆盖/跳跃。
- \`/admin/after-sales\`：接入真实售后受理、处理和历史，保留原 Ardot 画面折叠预览；失败、无权限、空数据和并发冲突有明确提示。
- 域单元测试覆盖有效受理、未知车辆、权限拒绝、状态非法跳转、冲突和关闭；前端契约测试验证 API、迁移约束、页面接线。
- 新增包已登记在 pnpm workspace lockfile 与 API 组合；依然使用原有 Neon/PostgreSQL 和 Cloud Run，不新增第二套运行基础设施。

**明确未交付：** 客户/Dealer 对外提交、Shopify 订单身份映射、已验证车辆所有权、保修条款/判定、诊断/维修工时、零件替换及库存台账、经销商维修协作、用户/服务商派工、附件与通知，以及真实浏览器/生产业务验收。这只是 #31 的可追溯工单最小切片，不得关闭 #31 或 #212。

**数据库发布风险：** 此 PR 增加新迁移，虽然没有删除/修改原有表和真实数据，但生产发布会应用正式 schema 变更；必须在隔离 CI 验证迁移、权限和 API 后人工审查，保持 Draft，不自动合并发布。


## 七、第五批：维修证据与保修初评（Draft PR，尚未上线）

- `0026_service_evidence_foundation.sql` 新增 `service.case_activities`，持久化内部诊断（DIAGNOSIS）、维修活动与工时（REPAIR_NOTE）及保修**初步评估**（WARRANTY_ASSESSMENT）。
- 写入记录具备：车辆关联的真实 Service Case、操作者、记录时间、事件类别、审核依据、必要的工时或初评结果；服务端 + PostgreSQL 禁止修改/删除历史行。
- 工单必须为 TRIAGED / IN_PROGRESS 才可记录证据；维修工时仅限 IN_PROGRESS；已解决和已关闭不可插入新操作。
- `service.warranty.review` 作为额外权限，默认只赋予 system_admin。即使 service_agent 具备 service.write，也不能单独提交保修初评；将来应配置经审核的保修专员角色。
- 初评选项只有 `EVIDENCE_REQUIRED`、`POSSIBLY_COVERED`、`POSSIBLY_EXCLUDED`，**并非法定保修资格或商业承诺**。正式 APPROVED / DENIED 需要验证车主归属、订单/交付、政策版本和证据后，另行开发受控审批。
- `POST /api/v1/service/cases/:id/activities` 使用 `clientRequestId` 幂等键，重复同一请求不会重复写入或审计；相同键尝试提交不同载荷返回冲突。锁定工单行并在同一事务内追加活动和审计。
- `GET /api/v1/service/cases/:id` 在历史状态旁额外返回活动证据；`/admin/after-sales` 新增录入、查看、失败重试 UI，保持 85 张 Ardot 设计图和旧业务页不变。
- **不执行**配件出库、库存数量变化、成本/付款计算、外部经销商访问、自动邮件通知或车主所有权绑定；这些均需要各自所属领域接口与授权验收。
- 本批只写 GitHub 分支 `feat/admin-live-operations-closure-20261019`，PR #211 保留 Draft。迁移和容器 CI 只在临时数据库执行。用户真实业务验收与生产发布尚未完成。
