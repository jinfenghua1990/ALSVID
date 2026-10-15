# Dealer Portal — UI 设计参考稿

ALSVID 经销商门户（Dealer Portal）的高保真 UI 原型，用于对齐信息结构与交互流程。

> **这是设计参考物，不是生产代码。** 纯静态 HTML/CSS/JS，不参与构建，不受 `pnpm arch:check` 约束。
> 落地为 `apps/` 下的正式前端应用时，需按 monorepo 规范重写为 Next.js App Router + `@alsvid/ui`。

门户定位见 `docs/FOUR_PORTALS_AND_SHOPIFY_2026-10-13.md`：Dealer Portal 为四门户之一，目标域名 `dealer.chaibenn.com`，与 Admin / My ALSVID / 品牌官网共用同一套 API 与设计系统。

## 页面清单

| 文件 | 页面 | 主要包含 |
|---|---|---|
| `index.html` | 工作台 | 概览卡、快捷入口、待办 |
| `catalog.html` | 产品目录 | 车型筛选、产品网格 |
| `product.html` | 产品详情 | 规格、配置、下单入口 |
| `orders.html` | 订单管理 | 状态筛选、订单列表 |
| `parts.html` | 配件订购 | 配件网格、Add Request |
| `purchase.html` | 采购申请 | 申请列表、新建申请 |
| `vehicles.html` | 车辆管理 | 在途/已交付、VIN 追踪 |
| `inventory.html` | 库存看板 | 库存分布、预警 |
| `after-sales.html` | 售后服务 | 报修表单、工单列表 |
| `documents.html` | 资料中心 | 协议、手册、技术资料、营销素材 |
| `account.html` | 账户设置 | 经销商信息、联系人、偏好 |

## 目录结构

```
.
├── *.html            11 个页面
└── assets/
    ├── tokens.css        设计令牌（颜色 / 字号 / 间距 / 圆角）
    ├── base.css          基础重置与排版
    ├── components.css    组件样式（按钮 / 卡片 / 徽章 / 表格 / 表单…）
    ├── layout.css        布局（外壳、侧栏、栅格、响应式）
    ├── app.js            壳层渲染、筛选、搜索、Demo Data 注入
    ├── demo-data.js      演示数据
    └── favicon.svg
```

## 打开方式

无构建步骤，直接打开 `index.html` 即可；或起一个静态服务：

```bash
npx serve .        # 或 python -m http.server
```

## 交互约定

- **Demo Data 开关**：默认关闭，页面显示空状态与「待接入」提示；开启后注入演示数据，用于评审完整界面。
- **概览卡 vs 快捷入口**：概览卡是*状态视角*，点击携带 `?status=` 跳转到目标页并自动选中筛选；快捷入口是*功能入口*。两者不重复。
- **搜索**：目录 / 配件 / 资料页输入即过滤，空结果有明确提示；顶部搜索回车跳转产品目录并落地过滤。
- **响应式**：≤1100px 收起侧栏，≤720px 单列堆叠。

## 数据合规约束

按 `docs/FOUR_PORTALS_AND_SHOPIFY_2026-10-13.md` 第 4 节要求，**尚未确认的价格策略、结算方式与信用条款一律标注「待决策」，不自行编造**。

因此本原型的所有金额字段均为 `待决策` 占位（`assets/app.js` 中的 `money()` 统一渲染为灰色标签），**不是可用金额数据**。接入真实 API 时请替换为契约中的价格字段。

## 状态标记

- 状态标签配色集中在 `assets/app.js` 的 `STATUS_CLASS`，新增状态需同步补映射，否则回落为中性灰。
- 页面上的交互均为前端演示，无后端调用。
