# My ALSVID 车主中心架构与产品规范

状态：V1 冻结，持续实现中  
适用端：`/my` 车主端  
官方首页：<https://www.chaibenn.com/>

## 1. 产品定位

My ALSVID 是车主生命周期中心，也就是车主的“我的车库”。它围绕车辆资产组织信息，不是商城账户页、Admin 后台、ERP、数据大屏或普通 CRM。

核心链路：

```text
Customer → Vehicle → VIN / Frame Number → Order
         → Warranty → Service → Repair → After-sales
         → Documents / Parts
```

同一台车只允许有一个权威 Vehicle 对象，由不同端按权限展示不同视角：

```text
Vehicle
├── Admin：生产、库存、订单、售后
├── Dealer：销售、交付、服务能力、售后
└── My ALSVID：车主车辆、保修、服务、维修、文件、售后
```

## 2. 视觉与品牌规范

视觉跟随 ALSVID 官方首页：浅灰或白色背景、黑色文字、细线分隔、克制的圆角胶囊导航、充足留白、车辆作为主视觉。参考 Apple ID、Tesla Garage、Shopify Account 的简洁车主空间体验。

禁止使用 ERP 风格、密集后台表格、KPI 卡片堆叠、数据大屏、普通会员等级和强营销弹窗。

顶部固定结构：

```text
ALSVID | My ALSVID | 首页 | 我的车辆 | 服务 | 我的账户 | 官方首页 ↗ | 账户
```

“官方首页 ↗”必须新标签打开，当前车库页面保持不变；域名通过统一 portal routing 生成，禁止在多个页面硬编码不同域名。

## 3. 页面信息架构

```text
/my                              首页 / Owner Dashboard
/my/vehicles                     我的车辆
/my/vehicles/register            添加或绑定车辆
/my/vehicles/[vehicleId]         车辆详情
/my/service                      服务与售后
/my/service/new                  新建售后申请
/my/account                      我的账户
```

首页必须先展示当前车辆：车辆图片、车型、VIN、Frame Number、状态、保修和快捷入口。订单金额、统计数字和后台指标不能成为首屏主内容。

## 4. 多车辆交互

用户拥有多辆车时，首页显示“我的车辆 · 共 N 辆”，桌面端提供左右箭头、序号、分页圆点、键盘左右键和“查看全部车辆”；移动端支持左右滑动，并显示轻量提示。不得自动轮播。

车辆切换必须同步更新图片、车型、VIN、Frame Number、购买日期、保修、最近服务、售后入口、说明书、配件和详情链接。单车用户隐藏全部轮播控制。

浏览器可记忆最近车辆，键名必须按用户隔离，例如 `alsvid:garage:vehicle:<userId>`。localStorage 只负责体验，不能作为权限依据；无效 ID 自动回退到第一辆有效车辆。

提醒只用于具体车辆的重要事件，例如保修即将到期、待处理售后、预约服务或安全问题；提醒必须写明车辆名称。

## 5. 车辆详情模块

车辆详情是核心页面，包含车辆概览、保修、服务记录、维修记录、售后申请、用户手册、文件资料和配件。

车辆概览字段：车型、配置、颜色、VIN、Frame Number、生产日期、购买日期、交付日期、购买渠道、经销商来源和当前状态。

保修字段：保修类型、开始日期、结束日期、剩余天数和状态。状态包括有效、即将到期、已过期、暂停、待确认。

服务与维修使用时间线呈现，记录服务编号、日期、地点、服务内容、配件、处理人员和状态。

售后申请必须绑定当前车辆，支持问题类型、问题描述、照片和联系方式。提交后显示申请编号、状态和预计响应时间。

文件按车辆自动匹配，包括用户手册、快速开始指南、维护指南、保修文件、发票、服务报告和维修报告。

配件推荐必须按车型、配置、年份和兼容性规则筛选；商城联动属于后续阶段。

## 6. 权限与数据规则

普通车主只能读取自己的车辆、VIN、订单、保修、服务、维修、文件和售后；不能通过修改 URL 访问其他车辆。车辆详情、VIN 查询和售后提交都必须在服务端校验当前用户与 Vehicle 的归属关系。

不要复制车辆数据库，不要让前端决定权限，不要把 fixture 当成生产客户数据。生产、库存、订单、售后和车主端通过关联 ID 连接同一套事实来源。

## 7. 组件与代码规范

- 服务端组件负责认证、权限和数据读取；客户端组件只负责交互。
- 车辆切换逻辑集中在 Owner Dashboard，不能在多个页面各自维护车辆状态。
- 使用现有 CSS Module 和设计变量，不创建第二套视觉系统。
- 多车控制仅在车辆数量大于 1 时渲染。
- 所有图标按钮必须有 `aria-label`，当前车辆和分页状态要可被辅助技术读取。
- 触控区域必须适合移动端点击，页面不得出现横向溢出。
- 官方首页链接统一使用 `portalUrlFor(..., 'www')`。

## 8. 当前实现状态

已实现：Owner Dashboard、车辆主视觉、多车辆箭头与滑动、键盘切换、分页、最近车辆记忆、关联信息同步、售后车辆预选、官方首页新标签链接和移动端适配。

当前本地地址：`http://localhost:3000/my`。本地车辆数据仍是开发预览 fixture，不代表真实客户数据。后续应接入真实 Vehicle、Warranty、Service、Repair 和 After-sales 权限数据。

主要文件：

```text
apps/web/app/my/page.tsx
apps/web/app/my/_components/owner-dashboard.tsx
apps/web/app/my/garage.module.css
apps/web/app/_components/owner-shell.tsx
apps/web/app/_components/owner-shell.module.css
apps/web/app/_lib/portal-routing.ts
```

## 9. 验收清单

- 未登录访问 `/my` 正确进入登录流程。
- 单车时隐藏箭头、圆点和滑动提示。
- 多车时桌面箭头、键盘和移动滑动均可用。
- 切换后车型、VIN、保修、服务和售后入口一致。
- 刷新后恢复最近车辆，无效 ID 能回退。
- 售后提交只绑定当前用户和当前车辆。
- URL 不能绕过车辆权限。
- 官方首页链接指向 `https://www.chaibenn.com/` 并新标签打开。
- 桌面和移动端均无横向溢出、焦点清晰、按钮有可访问名称。

验证命令：

```bash
pnpm --filter @alsvid/web typecheck
pnpm arch:check
pnpm --filter @alsvid/web test
pnpm --filter @alsvid/web build
```

## 10. 后续开发顺序

```text
官方首页风格同步 → 我的车辆 → 车辆详情 → 保修 → 服务记录
→ 维修记录 → 售后申请 → 我的账户 → VIN 绑定
→ 真实权限 → Admin / Dealer / My 数据关联 → 配件商城
```

后续机器人修改前必须先读取本文档和现有 OwnerShell、OwnerDashboard，不得直接重写车主端整体结构，也不得删除其他机器人未完成的本地改动。
