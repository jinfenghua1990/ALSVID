# ALSVID UI Design V2

## Design Direction

ALSVID adopts a premium mobility platform style inspired by automotive brands (Tesla/DJI style), while keeping enterprise management efficiency.

The UI should feel like a global bicycle brand digital platform, not a traditional ERP system.

Core principles:

- Product-first presentation
- Large hero imagery
- Premium automotive feeling
- High whitespace
- Rounded cards
- Blue accent color
- Professional enterprise usability
- One visual system across every user-facing page
- First-class Light and Dark modes
- Real business data only; never invent dashboard values

## Global Theme

Every user-facing ALSVID page must support both Light and Dark modes.

Rules:

- Theme selection is global, not page-specific.
- Theme choice persists in the browser.
- On first visit, ALSVID follows the operating-system color preference when the user has not chosen a theme.
- Primary navigation, secondary navigation, cards, tables, forms, dialogs, login, portal launcher, Admin, Dealer Portal and My ALSVID all inherit the same design tokens.
- A page must not remain visually in the old theme merely because its business module predates the V2 redesign.

## Real-data Rule

The interface must never display invented business facts merely to make a dashboard look populated.

When no real record exists:

- KPI values remain blank or show a neutral empty state.
- Charts show `暂无数据` instead of synthetic curves.
- Activity feeds show `暂无数据` instead of example activities.
- Vehicle 360 does not invent vehicle health, GPS, battery, OTA or online state.
- Dealer, customer, order, service and finance data appears only after manual entry or an approved external integration provides a real fact.

Conceptual product taxonomy such as FC / CT / FT / GT may be shown as product structure, but operational counts and transactions must come from actual stored data.

## Navigation Structure

### Top-level navigation

The top navigation is the primary business navigation:

- 首页 Dashboard
- 产品中心 Product Center
- Vehicle 360
- 订单管理 Orders
- 经销商 Dealers
- 售后服务 Service
- 配件 BOM
- 客户中心 Customers
- 系统设置 Settings

## Secondary Navigation

Secondary navigation appears on the left according to the active module.

The sidebar should be minimal and light, not a traditional heavy ERP sidebar.

Example: Product Center

- 产品系列
- 产品型号
- 配置管理
- BOM结构
- 图片/视频素材
- 技术资料
- 供应商管理

Example: Vehicle 360

- 车辆档案
- VIN查询
- 生产记录
- 质量记录
- 物流追踪
- 销售记录
- 售后记录

Planned routes must be visibly disabled or marked as planned; do not link users to non-existent pages.

## Dashboard Layout

Homepage should include:

1. ALSVID brand hero area
2. Product Series cards
3. Business KPI summary
4. Order trends
5. Sales distribution
6. Recent activities

Product series cards:

- FC1 Folding Carbon Series
- CT1 City Touring Series
- FT1 Fat Tire Series
- GT1 Grand Touring Series

Operational sections remain empty until real data exists.

## Product Center Definition

Product Center manages what ALSVID sells.

Structure:

- FC Series
  - FC1
  - FC1 Pro
- CT Series
  - CT1
- FT Series
  - FT1
- GT Series
  - GT1

Each product contains:

- Product positioning
- Specifications
- Variants
- Colors
- Media assets
- BOM
- Supplier information
- Technical documents

## Vehicle 360 Definition

Vehicle 360 is lifecycle tracking, not real-time IoT monitoring.

Current scope:

Production -> Quality Check -> Warehouse -> Shipping -> Dealer -> Customer -> After-sales

Vehicle record includes:

- VIN/frame number
- Production batch
- Supplier
- Shipping records
- Dealer
- Customer
- Service history

Not included at current stage:

- Real-time health monitoring
- Battery telemetry
- GPS tracking
- OTA

Vehicle 360 only shows facts that have actually occurred and been entered or synchronized. Future expansion may add smart vehicle functions only if ALSVID products later support connected hardware.

## Page Coverage

The V2 visual system applies to the complete current web surface, including:

- Portal Launcher
- Login
- Admin Dashboard
- Business Overview
- Product Center
- Vehicle 360
- Production / Quality
- Supply / Procurement
- Inventory / Warehouse
- Logistics / Customs
- Commerce / Orders
- Dealer Management
- Finance
- Partner Management
- Employee Center
- System / Environment Settings
- Dealer Portal
- My ALSVID

New user-facing pages must use the same shared tokens and Light/Dark behavior from their first implementation.

## Frontend Implementation Direction

Implementation priority is now a shared system rather than isolated page redesigns:

1. Global Design System
   - Light / Dark tokens
   - Theme persistence
   - Top navigation
   - Dynamic left sidebar
   - Shared cards, forms, tables and empty states

2. Apply the system to every existing page

3. Dashboard and Product Center product-led presentation

4. Vehicle 360 lifecycle tracking

5. Dealer, after-sales and customer modules as real capabilities become available

This document is the authoritative UI reference for current ALSVID frontend work.
