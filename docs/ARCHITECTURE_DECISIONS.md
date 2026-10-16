# ALSVID Architecture Decisions Overview

## Portal direction update — 2026-10-16

[ADR 0004](adr/0004-portal-experience-commerce-and-supplier.md) fixes design ownership, commerce versus upstream procurement, and phased Supplier self-service. Use the [portal delivery plan](PORTAL_DELIVERY_PLAN_2026-10-16.md) for implementation evidence and next tasks. This supplements the existing modular-monolith/provider boundaries; it does not declare all portals delivered.

## 1. Why ALSVID Exists

Modern bicycle business systems already have specialized platforms:

- Shopify handles ecommerce transactions.
- WMS handles warehouse execution.

However, these systems do not naturally provide a complete vehicle lifecycle record.

ALSVID exists to create a long-term digital identity for every bicycle.

Core value:

- Vehicle history
- Customer ownership
- Warranty lifecycle
- Service records
- Dealer support
- After-sales visibility

---

## 2. Why ALSVID Does Not Build an OMS

ALSVID intentionally does not become an Order Management System.

Reasons:

- Shopify already manages orders.
- WMS already manages fulfillment execution.
- Duplicating order logic creates unnecessary complexity.
- Large order databases would increase maintenance cost.

ALSVID stores normalized business facts needed for vehicle lifecycle services.

---

## 3. Data Flow Strategy

ALSVID obtains required information from Shopify and WMS.

Current approach:

- Daily synchronization/reconciliation.
- Cached business facts for normal viewing.
- Customer can request latest status refresh.
- Real-time synchronization is optional future optimization.

---

## 4. Runtime Decision

Primary production runtime:

Google Cloud Run

Why:

- Major cloud provider.
- Native container support.
- No server maintenance.
- Suitable for internal systems and customer service portals.
- Keeps future migration possible through Docker.

Fallback:

1. Railway
2. Apply.Build

---

## 5. Database Decision

Technology standard:

PostgreSQL

Primary provider:

Neon PostgreSQL

Why:

- PostgreSQL compatibility.
- Modern managed service.
- Suitable for development branches and production workloads.

Alternative:

Supabase PostgreSQL

Supabase remains a migration option, not the current primary choice.

---

## 6. Object Storage Decision

Primary object storage:

Cloudflare R2

Used for:

- Vehicle images
- Service photos
- PDF documents
- Customer files

Reason:

Large files should not be stored inside the database.

---

## 7. Environment Strategy

Current environment model:

- Local workstation/Docker for development.
- Disposable GitHub CI runners for automated validation.
- Production on Cloud Run in `alsvid-prod`.
- The former cloud Development/Test runtime is retired from the release flow.

Production uses Neon and R2 Production resources. Local/CI resources are isolated and must not receive Production credentials.

## 8. Q4 Position

Q4 is not part of the current production runtime architecture.

Future consideration:

- Backup
- Disaster recovery
- Recovery testing

Advanced disaster recovery is postponed until business scale requires it.


## 7. Current environment and release boundary (2026-10-14)

Production in `alsvid-prod` is the only live cloud runtime. Local Docker and disposable GitHub CI provide development and validation. The former `alsvid-dev` Cloud Run runtime and Development promotion workflow are retired. Pull requests target `main`, and Production deploy requires successful CI for the exact commit. This supersedes older environment-flow descriptions in historical records; it does not assert the live deletion status of any cloud resource.
