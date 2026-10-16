# ALSVID Official Website Navigation Architecture

> Historical navigation proposal. Current product/design scope follows [the portal boundary](DESIGN_TOOL_AND_PORTAL_BOUNDARY_2026-10-16.md) and [delivery plan](PORTAL_DELIVERY_PLAN_2026-10-16.md). Supplier Portal is an authenticated, scoped collaboration target, not a required public consumer navigation item; do not implement this historical menu as a second competing website structure.

## Purpose

This document defines the public-facing ALSVID official website structure. It is separated from the internal Admin / ERP / MES operation system.

The website focuses on brand, products, technology, ownership experience and business entry points.

---

# Header Navigation

Desktop navigation:

- Bikes
- Technology
- Accessories
- Support
- Explore
- Business
- Dealer Login
- Search

---

# 1. Bikes

Product platform showcase.

## Categories

- FC Series - Folding Carbon
- CT Series - City Touring
- FT Series - Fat Tire
- GT Series - Grand Touring

Additional pages:

- All Bikes
- Compare Bikes

---

# 2. Technology

ALSVID technology and engineering showcase.

Sections:

- Carbon Engineering
- Folding Technology
- Smart Mobility
- Frame Architecture
- Battery System
- Manufacturing Process
- Engineering Exploration

Includes:

- CAD visualization
- 3D exploded views
- Engineering animation
- Material explanation
- Manufacturing stories

---

# 3. Accessories

ALSVID ecosystem expansion.

Sections:

- Riding Equipment
- Bike Accessories
- Smart Devices
- Replacement Parts
- Upgrade Kits

---

# 4. Support

Owner lifecycle service center.

Sections:

- Vehicle Registration
- My ALSVID
- Warranty Service
- Repair Request
- Maintenance Guide
- Parts Query
- User Manual
- FAQ
- Service Locations
- Contact Us

Future integration:

Frame number -> QR code -> Vehicle profile -> Warranty -> Service history -> Parts

---

# 5. Explore

Brand and community content.

Sections:

- ALSVID Story
- Design Philosophy
- Innovation
- Riding Guide
- Travel Stories
- News & Events

---

# 6. Business

Commercial partnership entry.

Sections:

## Dealer Program

For:

- Bike shops
- Regional distributors
- Market partners

Functions:

- Become a Dealer
- Dealer Support
- Sales Materials
- Dealer Application

## Supplier Partnership

For:

- Component suppliers
- Manufacturing partners
- Material providers

Functions:

- Supplier Requirements
- Quality Standards
- Technical Documents
- Supplier Application

## Corporate Sales

For enterprise and institutional purchasing.

## Brand Partnership

For strategic cooperation.

---

# Dealer Login

Dealer Login is a top-level entry because dealers are daily business users.

Flow:

Official Website

-> Dealer Login

-> Dealer Portal

-> B2B Ordering System

Dealer Portal functions:

- Dashboard
- Product Catalog
- B2B Orders
- Order History
- Inventory Query
- Dealer Pricing
- Marketing Materials
- After-sales Support

---

# System Separation

## ALSVID Official（ALSVID 官网）

Brand / Product / Customer / Partner entry

## ALSVID Dealer Portal（经销商平台）

B2B sales operation

## My ALSVID（车主中心 / 我的车库）

Owner vehicles / ownership / warranty / service lifecycle

## ALSVID Admin（内部运营中心）

ERP / CRM / MES / Supply Chain / Production Management

The four projects are independent frontend applications rather than pages in one system. Most entry relationships are cross-application links, with unified identity and selected authorized data integration. Admin provides a top-right App Switcher labelled 官网, 车主中心, 经销商平台; see [APP_ENTRY_ARCHITECTURE.md](APP_ENTRY_ARCHITECTURE.md).
