# ALSVID 跨门户最小真实链路交接 — 2026-10-19

> 本文是 Draft PR #211 代码证据，不是正式环境已发布或 Shopify 已授权声明。原 Admin Ardot、My Figma、Supplier/Dealer Figma 来源与交互资料全部保留。

## 供应商 → Admin 采购

1. **Identity 权威**：`identity.supplier_memberships` 把已验证账号绑定到指定上游 Partner；状态 ACTIVE/DISABLED；审核凭证、审核员工和时间保存在正式关系表中。启用同时赋予 `supplier_user` 角色，停用后所有该 Partner 的供应商数据即时失效。仅 `system_admin` + `identity.role.manage` 能通过 `POST /v1/auth/supplier-memberships` 创建或停用。
2. **Supplier 门户**：`/supplier` 独立路由，需 Supplier 登录和供应商角色，`GET /v1/supplier/purchase-orders` / `GET /v1/supplier/purchase-orders/:id` 由服务端会话取 userId，用 `identity.supplier_memberships`、启用的 Supplier/Factory Partner、用户 ACTIVE 检查每条记录。不能靠前端 Partner ID 绕过范围；草稿单不公开。
3. **确认采购单**：`POST /v1/supplier/purchase-orders/:id/acknowledge` 只接受已发布且版本未变的原采购单、全量等价确认的行 ID/数量及备注。不同组织 PO、错行、篡改数量、跳过版本均拒绝。历史 `procurement.supplier_confirmations` 与原 PO 状态变更仍是单一 Procurement 权威；`procurement.supplier_po_acknowledgements` 是不可变提交凭证。幂等键 `clientRequestId` 及校验载荷阻止重复确认，同事务写审计。审核/发货/部分交付、变更提案和真实仓库收货仍未开放。
4. **运营界面**：`/admin/settings` 的“跨门户授权与交付核验”提供已注册用户 ↔ 启用供应商 Partner 的明确绑定/停用；不可只根据邮箱相等自动授权。
5. **尚未完成**：外部邮箱供应商邀请/激活、权限独立邀请流程、报价提案、部分交付、交期变更、发货通知、发票/文件上传、组织附件授权、邮件通知、实际供应商 DNS/浏览器/生产业务验收。因此 Issue #185 **不能关闭**。目前已有身份系统对新用户使用公司邮箱/邀请策略，不能未经专门验证就声称任意外部供应商邮箱均可注册。

## Admin → My ALSVID 我的车库

1. **Vehicle 权威**：迁移 `0028_vehicle_owner_access_events.sql` 将员工核验的车辆 ↔ 客户账号关系记为不可修改的 GRANTED/REVOKED 事实，按递增事件序号判定当前访问权；授予/撤销用车辆行锁，同事务记 Audit。
2. **内部交付**：`POST /v1/vehicles/:id/owner-access/grant` 提交已完成核验的客户账号 UUID + 交付/订单/人工审核证据编号；需要 `system_admin` + `vehicle.owner.manage`，目标账号必须 ACTIVE、邮箱已核验且具有 `customer_user` 角色。存在活动车主时不能直接覆盖，必须先撤销旧关系。撤销接口 `POST /v1/vehicles/:id/owner-access/revoke`。
3. **My 真实读取**：`GET /v1/my/garage`、`GET /v1/my/garage/:id` 的全部查询从当前用户会话读取 userId，SQL 查询该车辆最新 GRANTED 事件，禁止 ID 替换越权与撤销后继续访问。查询结果仅包含真实出生车辆及 SKU/Frame；不把 Owner 登录、同邮箱、VIN 文本或 Admin 角色当作所有权。
4. **真实 UI 替换**：`apps/web/app/my/_data/garage-live.ts` 服务端使用独立 My Session 调用授权 API；`garage.ts` 保留纯 UI 类型、工具函数但删去全部演示 VIN、虚构购买、保修及维修数据。My 主页、车辆详情、服务、账户、手册、配件等页面读同一真实授权层。缺交付/保修/颜色/文件数据明确显示“待核验”；空/未授权车库为空，不产生模拟成功。
5. **尚未完成**：Shopify Customer Account OAuth/PKCE 实际回调、subject 映射及账号激活，Shopify 付款/订单 → 已验证交付 → Customer 归属自动核验、车主自助 VIN 核验、My 申请售后写入、Service 与 Customer 双向受控读取、经销商交付协作、保修凭据起止/配件与附件权限、真实双账号 IDOR/浏览器上线验收。因此 #30/#48/#50/#57/#31/#212 **保持开放**。
6. **重要边界**：上述管理员人工审核授权只说明内部证据已经核验，不等于 Shopify 用户身份已经通过 OAuth 验证。正式对消费者开放前必须完善 OAuth 和门户 Host/Cookie 信任。

## 验证计划

- 持续运行 CI 的 `pnpm arch:check`、`pnpm typecheck`、`pnpm test`、`pnpm build`；容器构建、临时数据库迁移与 API 冒烟检查。
- Supplier 至少两组织成员、停用成员、已发布/草稿 PO、越权单号、错行/错数量、重复提交验证；My 至少双客户、授权前后、撤销后、跨客户替换 VIN 路由检查。
- 生产发布独立审批：当前 Draft PR **不得设 Ready，不得合并、不使用生产凭据运行迁移**；所有旧画面、文件和设计方案保留以备后续迭代。
