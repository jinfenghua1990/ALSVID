# ALSVID UI Design V1

## Design Direction

ALSVID adopts a premium mobility platform style inspired by automotive brands (Tesla/DJI style), while keeping enterprise management efficiency.

## Navigation Structure

Top-level navigation:

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

Example: Product Center

- 产品系列
- 产品型号
- 配置管理
- BOM结构
- 图片/视频素材
- 技术资料
- 供应商管理

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

## Visual Style

- Premium automotive feeling
- Large product hero images
- Clean white interface
- Blue accent color
- Rounded cards
- High whitespace
- Product-first presentation

This document is the reference for future ALSVID frontend implementation.