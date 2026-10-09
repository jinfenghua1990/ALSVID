# ALSVID Architecture

Status: standalone extraction baseline

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

Runtime code must not reintroduce `current_workspace_id`, `X-Chaiben-*`, `chaiben.*`, 1688, JackYun/吉客云 or DOMESTIC workspace identity assumptions. Architecture tests enforce these boundaries.

## Domains

### Identity and access
Users, roles, permissions, sessions and audit are ALSVID-owned. A session represents one authenticated ALSVID user and does not carry a legacy `current_workspace_id`. Dealer/customer access is narrowed by explicit membership and canonical business relationships rather than a company-wide Workspace switch.

The browser session cookie is `alsvid_session`. Mutation endpoints use session identity plus CSRF validation; UI visibility is never authorization. Role/permission evaluation happens on the backend from canonical `UserRole -> RolePermission -> Permission` facts.

### Partners
One canonical partner identity for factory/supplier/dealer/service-provider/customer organizations or people. Role-specific profiles attach to this identity. Lifecycle operations validate the required partner role instead of silently promoting a Partner to a new role as a side effect.

### Catalog
Canonical ALSVID Product and SKU operational identity.

### Product engineering
FC / FT / CT / GT platforms, models such as FC1 / FT1 / CT1 / GT1, variants, Parts, BOM revisions and released build specifications.

### Assets
Images, exploded views, manuals, 3D/GLB, video and service/dealer documents. Database owns metadata; R2 owns bytes. Customer-facing API projections never return raw object-storage keys; signed download URLs will be introduced only through the dedicated object-storage service.

### Supply chain
Supplier procurement, production batches, factory outbound, inbound receipts, warehouse stock and logistics required by ALSVID foreign-trade operations.

### Vehicle
One physical bicycle = one Vehicle. Immutable frame number, immutable birth/build evidence and append-only lifecycle events are authoritative.

Dealer custody is cyclical, not a one-time flag. A duplicate receipt in the same custody cycle is rejected; a later legitimate dealer transfer may start a new receipt/PDI cycle. A new retail handover always requires a PDI performed after the latest receipt for the current custody cycle.

### Dealer
Dealer authorization/profile, custody, receipt, PDI, handover, dealer stock views and permitted service access.

Dealer Portal access is scoped by both authenticated membership and the Vehicle's current dealer relationship. Guessing another dealer's frame number returns not found. Dealer API projections do not expose internal Vehicle IDs, customer Partner IDs or internal service diagnosis/resolution fields.

### Customer
Customer identity relationship, current/former vehicle ownership, My ALSVID Garage, secure claim/activation and consent evidence.

Dealer handover and My ALSVID activation are separate steps:
1. Dealer handover may establish the canonical buyer Partner and Vehicle ownership relationship.
2. My ALSVID Claim may later bind that already-recorded buyer Partner to a user account.
3. Claim must not create a second Customer Partner merely because the Vehicle already has a legitimate buyer from dealer handover.
4. For a Vehicle with no owner yet, a valid Claim may establish the first ownership relationship.
5. For a Vehicle whose buyer was recorded at handover, the claim email must match that recorded buyer identity unless a future explicit support/ownership-transfer flow verifies an exception.
6. Claim tokens are opaque, stored as hashes and one-time consumable. Customer-facing claim links place the raw token in a URL fragment rather than exposing an internal Vehicle identifier as authority.
7. Marketing consent is explicit and append-only. Vehicle claim/account registration does not imply marketing consent.

### After-sales
Warranty, ServiceCase, service status history, service parts and digital service-book projections.

My ALSVID may project safe service-history fields such as status, priority, issue summary and timestamps. Internal diagnosis/resolution remains internal unless a future explicit customer-safe field is designed.

### Commercial / finance
ALSVID-owned invoices, payments, receivables/payables and reconciliation facts required for operations. Do not migrate DOMESTIC-only China platform/accounting workflows by default.

## External systems

### Shopify
Shopify remains the external OMS. ALSVID may import/map confirmed commercial facts and use Shopify references, but must not duplicate Shopify order-management behavior merely to become self-contained.

### R2
R2/S3-compatible storage owns binary objects. Credentials never reach the browser. Browser upload/download uses short-lived signed URLs where appropriate.

### 1688 / JackYun
Out of scope and prohibited in ALSVID runtime. These belong to the separate domestic business.

## HTTP contracts

### Authentication
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`

Authenticated mutations require CSRF. There is no Workspace selector or ChaiBen identity header.

### Dealer Portal
- `GET /api/v1/dealer/vehicles/{frame_number}`
- `POST /api/v1/dealer/vehicles/{frame_number}/receipt`
- `POST /api/v1/dealer/vehicles/{frame_number}/pdi`
- `POST /api/v1/dealer/vehicles/{frame_number}/handover`

Every operation resolves the dealer from the authenticated user's canonical Dealer Portal membership and scopes the Vehicle to that dealer.

### My ALSVID
- authorized claim issuance: `POST /api/v1/vehicle-claims/{frame_number}`
- registration claim: `POST /api/v1/my-alsvid/claim/register`
- existing-account claim: `POST /api/v1/my-alsvid/claim/login`
- Garage list/detail: `/api/v1/my-alsvid/garage...`
- marketing consent read/write: `/api/v1/my-alsvid/account/marketing-consent`

Garage queries are owner-scoped by canonical `MyAlsvidAccount -> BusinessPartner -> Vehicle.current_customer_partner_id`; a user cannot obtain another owner's Vehicle by guessing a frame number.

## Vehicle invariants

1. Frame number is normalized once and remains immutable.
2. A new-system bicycle exists in the database before downstream dealer/customer/service activity.
3. Factory registration/outbound freezes released BOM/build evidence.
4. Later engineering/BOM changes never rewrite an existing Vehicle's birth facts.
5. Material lifecycle transitions append events; they do not erase historical relationships.
6. Dealer receipt -> PDI -> retail handover sequencing is validated using the latest relevant event, never an unordered arbitrary row.
7. A new dealer custody cycle invalidates a prior cycle's PDI for retail-handover eligibility.
8. Dealer-required lifecycle events require a canonical active dealer identity; customer-required events require a canonical active customer identity.
9. Ownership transfer changes current relationship, not Vehicle identity.
10. Service history follows Vehicle identity while customer PII remains access-controlled.
11. Account/portal activation attaches to canonical ownership; it never creates a duplicate Vehicle or duplicate buyer simply to satisfy portal login.
12. Lifecycle timestamps are normalized to UTC before chronological validation so PostgreSQL, SQLite tests and historical imports cannot produce aware/naive comparison bugs.

## Database migrations

The standalone repository owns its own Alembic chain. `20261009_0001_standalone_baseline` is an explicit immutable schema baseline for ALSVID-owned tables; historical revisions must never call `Base.metadata.create_all()` or otherwise depend on future ORM state.

CI upgrades a clean database to `head`, verifies table and column parity against the current ORM surface, then downgrades to `base`. Future schema changes require new revisions; the baseline is not edited to represent later changes.

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

Source removal from ChaiBen-OS remains a later, separate destructive step. It may begin only after the standalone capability, schema/data migration path and regressions are verified here.
