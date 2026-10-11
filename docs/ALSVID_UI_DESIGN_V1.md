# ALSVID UI Design V1

## Design Direction

ALSVID adopts a premium mobility platform style inspired by automotive brands (Tesla/DJI style), while keeping enterprise management efficiency.

The UI should feel like a global bicycle brand digital platform, not a traditional ERP system.

Core principles:

- Product-first presentation
- Large hero imagery
- Clean white interface
- Premium automotive feeling
- High whitespace
- Rounded cards
- Blue accent color
- Professional enterprise usability

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

The sidebar should be minimal Tesla-style, not a traditional heavy ERP sidebar.

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

Future expansion may add smart vehicle functions if ALSVID products support connected hardware.

## Frontend Implementation Direction

First implementation priority:

1. Global Layout
   - Top navigation
   - Dynamic left sidebar
   - Main content area

2. Dashboard

3. Product Center

4. Vehicle 360 lifecycle management

5. Dealer and after-sales modules

This document is the reference for future ALSVID frontend implementation.
