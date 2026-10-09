# ALSVID Architecture

Status: extraction baseline

## Goal

Run the ALSVID bicycle business as an independent system without ChaiBen-OS multi-workspace coupling, while preserving the durable bicycle/product/dealer/customer/service rules already validated in production-oriented work.

## Runtime

```text
Internal Admin / Dealer Portal / My ALSVID / Public Service
                         |
                         v
                    ALSVID API
                    FastAPI
                         |
                 domain services
                         |
                 SQLAlchemy 2.x
                         |
                    PostgreSQL

Binary assets ----------------------> R2 / S3-compatible object storage
Shopify ----------------------------> external commerce OMS integration boundary
```

Local extraction runtime defaults to port `8200` so it can coexist with the legacy ChaiBen-OS runtime during migration.

## Application boundary

ALSVID is now the repository/application boundary. The old `GLOBAL / DOMESTIC / ALSVID` Workspace switch is not part of this architecture.

A future legal-entity or country dimension may exist inside ALSVID when needed for EU operations, but it must represent real ALSVID organizational/accounting scope rather than recreating the old company-wide workspace selector.

## Domains

### Identity and access
Users, roles, permissions, sessions, audit. Dealer/customer access is scoped by explicit memberships and relationships.

### Partners
One canonical partner identity for factory/supplier/dealer/service-provider/customer organizations or people. Role-specific profiles attach to this identity.

### Catalog
Canonical ALSVID Product and SKU operational identity.

### Product engineering
FC / FT / CT / GT platforms, models such as FC1 / FT1 / CT1 / GT1, variants, Parts, BOM revisions and released build specifications.

### Assets
Images, exploded views, manuals, 3D/GLB, video and service/dealer documents. Database owns metadata; R2 owns bytes.

### Supply chain
Supplier procurement, production batches, factory outbound, inbound receipts, warehouse stock and logistics required by ALSVID foreign-trade operations.

### Vehicle
One physical bicycle = one Vehicle. Immutable frame number, immutable birth/build evidence and append-only lifecycle events are authoritative.

### Dealer
Dealer authorization/profile, custody, receipt, PDI, handover, dealer stock views and permitted service access.

### Customer
Customer identity relationship, current/former vehicle ownership, My ALSVID Garage, secure claim/activation and consent evidence.

### After-sales
Warranty, ServiceCase, service status history, service parts and digital service-book projections.

### Commercial / finance
ALSVID-owned invoices, payments, receivables/payables and reconciliation facts required for operations. Do not migrate DOMESTIC-only China platform/accounting workflows by default.

## External systems

### Shopify
Shopify remains the external OMS. ALSVID may import/map confirmed commercial facts and use Shopify references, but must not duplicate Shopify order-management behavior merely to become self-contained.

### R2
R2/S3-compatible storage owns binary objects. Credentials never reach the browser. Browser upload/download uses short-lived signed URLs where appropriate.

### 1688 / JackYun
Out of scope and prohibited in ALSVID runtime. These belong to the separate domestic business.

## Vehicle invariants

1. Frame number is normalized once and remains immutable.
2. A new-system bicycle exists in the database before downstream dealer/customer/service activity.
3. Factory registration/outbound freezes released BOM/build evidence.
4. Later engineering/BOM changes never rewrite an existing Vehicle's birth facts.
5. Material lifecycle transitions append events; they do not erase historical relationships.
6. Dealer receipt -> PDI -> retail handover sequencing is validated using the latest relevant event, never an unordered arbitrary row.
7. Ownership transfer changes current relationship, not Vehicle identity.
8. Service history follows Vehicle identity while customer PII remains access-controlled.

## Entrances

### Internal Admin
Primary operations UI: Workbench, Product Center, Supply-chain Center, Dealer Center, Customer Center, Vehicle Center, After-sales Center and Finance Center.

### Dealer Portal
Only authorized dealer facts: assigned/custodied Vehicles, PDI/handover, approved assets and separately authorized service facts.

### My ALSVID
Customer Garage, activation/claim, warranty/service presentation and vehicle-specific documents.

### Public/service
Narrow least-privilege flows such as secure activation or service intake. Public routes never expose predictable internal identifiers as authorization.

## Migration principle

Validated domain behavior may be preserved, but the old package layout and monolith assumptions are not authoritative. Code is reorganized by ALSVID-owned domains and rewritten when extraction reveals coupling or ambiguous logic.
