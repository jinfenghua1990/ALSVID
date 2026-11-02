# ALSVID Architecture Decisions Overview

## Portal direction update — 2026-10-16

[ADR 0004](adr/0004-portal-experience-commerce-and-supplier.md) fixes design ownership, upstream procurement and phased Supplier self-service. [ADR 0005](adr/0005-alsvid-owned-storefront-and-third-party-payments.md) supersedes the earlier Shopify-first B2C transaction decision: ALSVID owns its first-party storefront flow and a PSP performs payment processing. Architecture decisions do not mean the capability is already delivered.

## 1. Why ALSVID Exists

ALSVID keeps explicit boundaries between its own consumer storefront, payment providers and warehouse execution:

- ALSVID Commerce owns its own B2C storefront orders.
- A contracted PSP performs payment processing and funds movement.
- WMS handles warehouse execution.

ALSVID does not need Shopify to own its first-release storefront transactions.

ALSVID exists to create a long-term digital identity for every bicycle.

Core value:

- Vehicle history
- Customer ownership
- Warranty lifecycle
- Service records
- Dealer support
- After-sales visibility

---

## 2. Why ALSVID Does Not Build a General-Purpose OMS

ALSVID owns the narrow order lifecycle for purchases created on its own storefront, but it does not become a general-purpose OMS or marketplace aggregator.

- Its own consumer order and checkout records are owned by ALSVID Commerce.
- Payment execution remains with a contracted PSP; payment/refund/settlement facts are owned by Finance.
- WMS remains authoritative for warehouse operations and physical fulfillment.
- Optional external sales channels require a separately approved connector and must not create dual-write authority.

This keeps the required storefront flow in ALSVID without duplicating warehouse execution or building a broad multi-channel OMS.

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
- Production on Cloud Run in verified `alsvid-production` (`europe-west1`).
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

Production in verified `alsvid-production` (`europe-west1`) is the only live cloud runtime. The separately created `alsvid-prod` remains an unverified migration target, not the current deployment. Local Docker and disposable GitHub CI provide development and validation. The former `alsvid-dev` Cloud Run runtime and Development promotion workflow are retired. Pull requests target `main`, and Production deploy requires successful CI for the exact commit. This supersedes older environment-flow descriptions in historical records; it does not assert the live deletion status of any cloud resource.
