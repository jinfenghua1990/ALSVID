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

## First-party B2C storefront, not a general-purpose OMS

ALSVID owns the initial consumer storefront transaction flow: product/variant selection, cart, checkout orchestration, ALSVID storefront order creation, customer-visible order state and customer support entry points.

A separately contracted payment service provider (PSP) performs payment authentication, processing, refunds and settlement execution. ALSVID must not store full card numbers or card security codes.

This limited storefront scope does not turn ALSVID into a general-purpose OMS. ALSVID does not become a marketplace aggregator, warehouse execution system, or replacement for WMS. It owns only B2C orders created through its own storefront; optional external-channel orders require a separately approved connector and explicit data boundary.

## Not a WMS

Warehouse systems remain responsible for:

- Inventory
- Picking
- Packing
- Shipment execution
- Warehouse operations

ALSVID consumes necessary fulfillment information but does not replace warehouse software.

---

# 3. Payment provider and optional external channels

The first release does not depend on Shopify. ALSVID Commerce owns its own storefront orders; Finance owns payment/refund/settlement facts; Integrations verifies and records PSP events. The PSP is the external execution authority for card processing and funds movement. See [ADR 0005](adr/0005-alsvid-owned-storefront-and-third-party-payments.md).

Shopify or another sales channel may be evaluated later only after a separate owner decision. Any future connector must define the external facts ALSVID consumes and must not create dual-write authority for ALSVID storefront orders.

Supplier self-service remains separate from buyer commerce: suppliers submit proposals and PO commitments through the ALSVID Supplier direction; Procurement owns formal PO issue, approvals, receiving/QC and supplier payment. Supplier identity does not grant consumer checkout or dealer permissions. See [ADR 0004](adr/0004-portal-experience-commerce-and-supplier.md).

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

It should avoid becoming a replacement for WMS, a full ERP, or a general-purpose OMS. The ALSVID consumer storefront is first-party and provider-neutral; Shopify is optional, not a launch dependency.
