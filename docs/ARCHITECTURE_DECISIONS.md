# ALSVID Architecture Decisions Overview

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

Current stage:

Development/Test:

- M1 Mac
- Docker application runtime
- Managed cloud test database
- Managed cloud test object storage

Production:

- Cloud Run
- Neon Production database
- R2 Production storage

---

## 8. Q4 Position

Q4 is not part of the current production runtime architecture.

Future consideration:

- Backup
- Disaster recovery
- Recovery testing

Advanced disaster recovery is postponed until business scale requires it.
