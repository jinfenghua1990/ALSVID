# ALSVID Business Boundary

## Purpose

This document defines the responsibility boundaries between ALSVID and connected external systems.

The goal is to prevent duplicated business logic and keep ALSVID focused on vehicle lifecycle management.

---

# 1. ALSVID Positioning

ALSVID is a vehicle lifecycle and after-sales platform for bicycle brands.

ALSVID focuses on:

- Vehicle identity management
- VIN / frame number lifecycle
- Vehicle 360 view
- Customer relationship after purchase
- Dealer service support
- Warranty management
- Repair history
- Spare parts after-sales workflow

ALSVID is not designed to replace every existing business system.

---

# 2. What ALSVID Is Not

## Not an E-commerce Platform

Shopify already provides mature B2C commerce capabilities:

- Product catalog
- Shopping cart
- Payment
- Customer checkout
- Order creation

ALSVID does not rebuild these functions.

## Not an OMS

ALSVID does not become an Order Management System.

Reason:

- Shopify already manages commercial orders.
- WMS already manages warehouse execution.
- Building OMS logic inside ALSVID would create duplicate order processing, unnecessary complexity and large amounts of transactional data.

ALSVID stores only the business facts required for vehicle lifecycle, customer service and after-sales.

## Not a WMS

Warehouse systems remain responsible for:

- Inventory
- Picking
- Packing
- Shipment execution
- Warehouse operations

ALSVID consumes necessary fulfillment information but does not replace warehouse software.

---

# 3. Shopify Responsibility

Shopify's buyer-commerce ownership is separate from ALSVID's upstream procurement. Supplier self-service is a confirmed phased ALSVID portal: suppliers may submit quotations/proposals and PO commitments, while Procurement owns formal POs and authorized internal processes own approval, receiving/QC and payment. A Supplier that also buys from ALSVID has a separate Shopify B2B buyer relationship. See [ADR 0004](adr/0004-portal-experience-commerce-and-supplier.md) and the [implementation/action matrix](PORTAL_DELIVERY_PLAN_2026-10-16.md).

Shopify remains responsible for:

- Storefront product/catalog, pricing and selling configuration (ALSVID Product/Engineering owns internal SKU/build/BOM identity)
- Orders
- Payments
- Refunds
- Customer purchase transactions

ALSVID receives required normalized business facts from Shopify, including:

- Customer information
- Order reference
- Purchased product information
- Transaction relationship needed for vehicle ownership

ALSVID does not copy the entire Shopify database.

---

# 4. WMS Responsibility

WMS remains responsible for:

- Stock availability
- Warehouse operations
- Outbound processing
- Shipping information
- Tracking information

ALSVID receives required logistics facts for:

- Customer visibility
- Vehicle delivery status
- After-sales support

---

# 5. Data Synchronization Principle

ALSVID does not require full real-time replication by default.

Current model:

- Scheduled synchronization
- Cached business facts
- Manual refresh when needed
- Future webhook optimization if business requirements justify it

Customer-facing pages show:

- Last successful update time
- Refresh status
- Latest available information

---

# 6. After-sales Process Boundary

Example:

Customer needs replacement parts:

1. Customer contacts ALSVID after-sales.
2. ALSVID creates and manages the service case.
3. Internal staff confirms replacement requirement.
4. ALSVID sends fulfillment request to WMS.
5. WMS executes inventory and shipment.
6. ALSVID records the service history.

ALSVID manages the lifecycle record, not warehouse execution.

---

# Core Principle

ALSVID connects existing business systems and creates vehicle lifecycle value.

It should avoid becoming a replacement for Shopify, WMS or OMS platforms.
