# Current State

## Status

ALSVID-Next is the clean-slate implementation authority for ALSVID. It was created on 2026-10-10 and has not yet been deployed for real business operations. There is no production ALSVID business data and no backward-compatibility requirement with the previous ALSVID or ChaiBen-OS repositories.

The previous repositories are requirement references only. New architecture, schemas, APIs and UX should be optimized for the ALSVID bicycle/export/Europe business rather than preserved for compatibility.

A capability is considered implemented only when persistence, application logic, authorization, tests and the required user-visible workflow exist.

## Platform foundation — implemented

- TypeScript modular monolith
- Next.js Internal Admin web application
- NestJS API
- background worker shell
- PostgreSQL 18 authoritative business database
- S3/R2-compatible object-storage foundation
- clean migration lineage beginning at `0001`
- CI that applies all migrations twice against PostgreSQL 18, then runs typecheck, tests and build
- repository governance, domain ownership and business-flow contracts

## Phase 1A — Identity, Audit and Partner master — implemented

- users, roles, permissions and revocable sessions
- scrypt password hashing and explicit bootstrap administrator
- append-only Audit evidence
- unified Partner identity for organizations and people
- Partner roles: Supplier, Factory, Dealer, Customer, Service Partner and Logistics Provider
- Partner identifiers including VAT/EORI/registration references
- contacts and addresses with explicit purpose
- optimistic Partner versioning
- authenticated APIs and Partner Admin workspace

Still later: invitations/password reset/MFA, SSO/OIDC and any future multi-company row scoping.

## Phase 1B — Product, Engineering and Asset foundation — implemented

- FC / FT / CT / GT platforms
- Platform -> Model -> Variant -> SKU commercial hierarchy
- Part master
- BOM + immutable released BOM revisions
- released Build Specifications binding exact SKU to exact BOM revision
- engineering release permissions and PostgreSQL immutability guards
- Asset metadata and approved Product/Engineering links
- Product/Engineering APIs and Admin workspace

Still later: live R2/S3 transport/signed URLs, engineering change/supersession workflow and richer Product 360 media/document surfaces.

## Phase 1C — Procurement foundation — implemented

- supplier quotations
- Purchase Orders and decimal-safe PO lines
- Supplier/Factory Partner-role enforcement
- Draft -> Issued -> Confirmed -> Partially Fulfilled -> Fulfilled / Cancelled lifecycle
- issued PO commercial baseline protection
- append-only PO state snapshots
- supplier confirmation evidence
- Physical Receipt and Factory Commitment kept as distinct evidence
- Procurement API and `/supply` workspace

Procurement does not own Inventory, Production, bank settlement or CoffeeBear/1688/JackYun domestic workflows.

## Phase 1D — Production, QC and Vehicle Birth — implemented

- Production Orders bind one released Build Specification and one Factory Partner
- Production Order release expands quantity into individually traceable production units
- immutable released production baseline and append-only state history
- per-unit assembly/QC lifecycle
- append-only PASS / FAIL / HOLD QC inspections
- as-built deviation evidence tied to the released BOM
- Vehicle Birth requires latest QC PASS
- one production unit can birth at most one Vehicle
- unique immutable frame number and immutable birth provenance
- Production/Vehicle APIs and `/production` workspace

Still later: richer QC templates/assets, component serial consumption and privileged exceptional identity correction.

## Phase 1E — Inventory and Warehouse — implemented

- migrations `0006` through `0008`
- append-only movement ledger as the only quantity truth
- derived on-hand / reserved / available views
- Part, SKU and serialized Vehicle inventory in one model
- warehouse/location hierarchy for receiving, storage, staging, pick, quarantine and dispatch
- Receipt / Transfer / Issue / Return / Adjustment / Stocktake Correction movements
- movement idempotency
- negative-stock and reserved-stock database protection
- transaction advisory locks for concurrent writes to the same inventory position
- Vehicle-wide serialization preventing one bicycle appearing in two locations
- explicit reservation lifecycle and reservation-backed Issue
- append-only stocktake counts with compensating correction movements
- Inventory/Warehouse APIs and `/inventory` workspace

Inventory does not own Procurement commercial truth, Product/Vehicle identity, Logistics execution, Commerce facts or Finance valuation.

## Phase 1F — Export Logistics — implemented

- migrations `0009` through `0011`
- explicit routes:
  - China factory -> Germany warehouse
  - China factory -> Dealer direct
- route/geography database guards
- carrier/forwarder Partner references, mode, Incoterm, booking, B/L, container, tracking, planned ETD/ETA
- append-only actual Shipment milestone timeline
- cargo allocation through Inventory reservations
- dispatch through Inventory Issue; Logistics never directly writes Inventory truth
- serialized Vehicle allocation collision protection
- Germany delivery is distinct from Germany Inventory receiving
- explicit Germany receive action through Inventory Receipt
- dealer-direct flow cannot synthesize Germany receiving
- export/import customs declarations
- Partner-owned EORI references with ownership validation
- per-cargo origin, HS/CN/TARIC classification
- duty, import VAT, anti-dumping, countervailing and operational-fee facts for later landed-cost accounting
- append-only customs events and immutable declared evidence
- Logistics APIs and `/logistics` workspace

Still later: live carrier/broker connectors, generated customs/document packets, advanced load planning and Finance landed-cost posting.

## Phase 1G — Dealer, Commerce and Shopify synchronization — implemented

- migrations `0012_dealer_commerce_integrations.sql` through `0015_shopify_delivery_metadata.sql`
- Dealer profiles reference Partner records with enabled `DEALER` role; legal identity is never duplicated
- controlled Dealer lifecycle: Prospect -> Active / Closed, Active -> Suspended / Closed, Suspended -> Active / Closed
- append-only Dealer status history with explicit reason
- Dealer market coverage plus sales/service capability facts
- optional references to Partner shipping/contact facts and Inventory locations without copying their authority
- provider-neutral Commerce channel master with Shopify as the first provider
- external provider order and order-line facts with provider timestamps and stable external identifiers
- external fulfillment facts with optional ALSVID Logistics Shipment mapping
- external variant/SKU mapping to authoritative ALSVID Product SKU
- unknown Shopify variants remain visible reconciliation exceptions and never auto-create Product/SKU masters
- manual SKU mappings survive later provider updates
- stale provider events cannot regress newer external order/line/fulfillment facts
- Dealer and Customer order mappings validate authoritative Partner roles
- retained provider webhook delivery evidence, payload checksum and processing-attempt history
- Shopify delivery idempotency uses delivery/webhook ID; Shopify event ID is retained separately as correlation evidence
- rejected provider deliveries remain retained and can be replayed after the blocking mapping/order condition is resolved
- pull-sync cursor/checkpoint foundation
- authenticated Dealer, Commerce and Integrations APIs
- `/dealers` Dealer 360 foundation workspace
- `/commerce` Commerce/Shopify reconciliation workspace for channels, external orders, SKU mappings, Partner mappings, fulfillment-to-Shipment links, exceptions, delivery evidence and replay
- PostgreSQL integration tests cover Dealer role/lifecycle/history, Commerce role/mapping invariants, Shopify duplicate delivery, unknown variants, manual mapping preservation, stale updates and rejected fulfillment replay

### Shopify boundary

Shopify remains the external storefront and OMS. ALSVID does not implement cart, checkout, payment capture or a replacement generic order lifecycle. ALSVID owns normalized integration facts, mappings, reconciliation and links from external Commerce facts into ALSVID Product, Partner, Logistics, Vehicle and later Finance domains.

### Not yet live Shopify integration

The domain/adapter-facing ingestion foundation is implemented, but production Shopify connection still requires deployment-time work:

- Shopify app/client credentials and secrets
- HMAC-verified public webhook ingress
- production webhook registration/subscriptions
- GraphQL Admin API pull reconciliation and retry worker
- secure secret storage and operational monitoring

These are deployment/integration tasks, not reasons to duplicate Shopify inside ALSVID.

## Planned capability sequence

1. Identity, access, audit and Partner master — **foundation implemented**
2. Product + engineering + asset foundation — **foundation implemented**
3. Procurement + supplier PO/confirmation/receipts — **foundation implemented**
4. Production + QC + Vehicle Birth — **foundation implemented**
5. Inventory + warehouse operations — **foundation implemented**
6. Export Logistics: China -> Germany warehouse / Dealer direct — **foundation implemented**
7. Dealer + Commerce + Shopify fact synchronization — **foundation implemented**
8. Finance: AR/AP, invoice, payment, allocation, settlement, FX and landed cost
9. Vehicle 360 + ownership + customer garage
10. Service / warranty + parts + repair history
11. Communication Center + email marketing / consent / suppression
12. production deployment, observability, backup/restore and automated release workflow
