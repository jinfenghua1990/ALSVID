# Current State

## Status

ALSVID-Next is a clean-slate implementation created on 2026-10-10. No production or local business deployment exists yet and no real ALSVID business data needs backward compatibility.

The repository is therefore free to optimize architecture, schemas, APIs and user experience before the first real deployment.

## Authority

This repository is the implementation authority for the new ALSVID codebase. The previous ALSVID and ChaiBen-OS repositories are historical requirement sources only and must not be treated as code dependencies.

## Phase 0 — platform foundation

Implemented:

- repository governance and architecture contract
- domain ownership model and business-flow specification
- TypeScript monorepo
- Next.js web application shell
- NestJS API shell
- background worker shell
- PostgreSQL 18 and S3/R2-compatible local infrastructure
- CI with PostgreSQL migration verification, typecheck, tests and build

## Phase 1A — Identity, Audit and Partner master

Implemented:

- clean migration lineage beginning at `0001_identity_audit_partners.sql`
- Identity schema with users, role templates, permissions and revocable 12-hour sessions
- scrypt password hashing and explicit bootstrap-administrator command
- permission-based authorization for user, audit and Partner operations
- append-only Audit schema with database-level UPDATE/DELETE rejection
- unified Partner master for organization/person identities
- Partner roles: Supplier, Factory, Dealer, Customer, Service Partner and Logistics Provider
- globally unique normalized Partner identifiers such as VAT/EORI/registration references
- Partner contacts and addresses with explicit purpose
- optimistic Partner version control for concurrent edits
- authenticated NestJS APIs for login/logout/current user/users/roles/audit/partners
- Next.js Internal Admin sign-in flow using an HttpOnly session cookie proxy
- Partner list, search, detail, create and edit UI with role, identifier, contact and address visibility
- invariant tests for permissions, password verification, identifier normalization and duplicate roles

Not yet implemented in Identity/Partner scope:

- invitations, password reset and MFA
- SSO/OIDC
- fine-grained row/company scoping for a future multi-company requirement
- full UI editors for multiple Partner contacts/addresses/identifiers after initial creation

## Phase 1B — Product, Engineering and Asset foundation

Implemented:

- migration `0002_product_engineering_assets.sql`
- seeded FC / FT / CT / GT technology platforms
- Product hierarchy: Platform -> Model -> Variant -> SKU
- SKU market/color/size configuration facts kept separate from physical Vehicle identity
- optimistic versioning and lifecycle status for commercial Product entities
- Part master with category/unit/attributes
- BOM master, draft/released BOM revisions and BOM lines
- Build Specification linking an exact SKU to an exact BOM revision
- explicit engineering release permissions and audit evidence
- PostgreSQL guards that prevent silent mutation of released BOM revisions and released Build Specifications
- PostgreSQL guard preventing Build Specification release against an unreleased BOM revision
- Asset metadata for provider/bucket/object key/checksum/media metadata/visibility/classification
- generic Asset links to approved Product/Engineering entity types
- authenticated Product, Engineering and Asset APIs
- Internal Admin Product workspace for Model/Variant/SKU creation/editing and Part/BOM/Build Specification release workflow
- PostgreSQL integration tests for engineering release immutability

Not yet implemented in Product/Engineering/Asset scope:

- R2/S3 upload/download transport and signed URL adapter
- richer Product 360 media/document views
- engineering change orders / supersession workflow
- substitute-part approval workflow

## Phase 1C — Procurement foundation

Implemented:

- migration `0003_procurement.sql`
- supplier quotation headers and decimal-safe quotation lines referencing authoritative Part or SKU records
- purchase orders with decimal-safe quantities and unit prices, commercial terms and explicit lifecycle states
- database enforcement that procurement suppliers have an enabled Supplier or Factory Partner role
- PO lifecycle controls for Draft -> Issued -> Confirmed -> Partially Fulfilled -> Fulfilled / Cancelled
- issued PO line immutability and protection of core commercial terms after issue
- append-only PO state snapshots containing header and line facts on every state transition
- supplier confirmation evidence with per-line confirmed quantity/date
- Physical Receipt and Factory Commitment evidence kept distinct
- cumulative physical receipts can advance a confirmed PO to partially fulfilled or fulfilled
- explicit procurement permissions and audit evidence for create/issue/confirm/receipt actions
- authenticated Procurement API and `/supply` Internal Admin workspace
- Supply UI sources suppliers from Partner roles and purchasable items from Engineering Part/Product SKU authorities
- PostgreSQL integration tests covering supplier-role enforcement, invalid transitions, issued-line immutability and automatic state snapshots

Deliberately not owned by Procurement:

- inventory balances or stock movements
- production-order creation or Vehicle birth
- bank payment execution, AP settlement or payment allocation
- 1688, JackYun/吉客云 or CoffeeBear domestic procurement workflows

Not yet implemented in Procurement scope:

- multi-line quotation/PO editing in the first UI surface; the domain/API already accept line arrays
- formal purchase-order amendment/version workflow after issue
- RFQ comparison/award workflow across multiple suppliers
- supplier portal acknowledgement workflow
- document/PDF rendering for outbound purchase orders

## Phase 1D — Production, QC and Vehicle Birth foundation

Implemented:

- migrations `0004_production_vehicle.sql` and `0005_production_evidence_guards.sql`
- Production Orders reference one exact released Build Specification, one FACTORY Partner and optional confirmed Procurement PO source
- database enforcement that draft/unreleased Build Specifications cannot enter Production and non-FACTORY Partners cannot be factories
- explicit Production Order lifecycle: Draft -> Released -> In Progress -> QC Pending -> Completed / Cancelled
- release expands planned quantity into individually traceable physical production units
- released production baseline is immutable for Build Specification, factory, source PO and planned quantity
- append-only Production Order state history
- per-unit assembly state and QC state machine
- append-only PASS / FAIL / HOLD QC inspections
- Production Order completion requires every physical unit to be QC Passed
- append-only as-built deviation evidence for authorized part substitution
- deviation Expected Part must exist in the exact released Build Specification BOM
- as-built deviations cannot be added after QC Pass
- separate Vehicle domain and Vehicle registry
- Vehicle Birth requires a QC-passed production unit and the latest PASS inspection for that same unit
- Vehicle provenance is fixed to exact Production Order, Build Specification, SKU, factory and birth QC inspection
- unique immutable frame number enforced by PostgreSQL
- one production unit can birth at most one Vehicle
- Vehicle birth identity/provenance cannot be edited or deleted through normal data operations
- authenticated Production/Vehicle APIs and `/production` Internal Admin workspace
- Production UI supports order creation/release/start, assembly completion, QC, deviations, order completion and Vehicle Birth
- Vehicle registry surfaces frame identity plus SKU/Build Spec/Production Order/factory provenance
- PostgreSQL integration tests cover factory-role/build-spec gates, QC birth gates, deviation/BOM integrity, one-unit-one-Vehicle identity, immutable frame identity and no-delete protection

Deliberately not owned by Production/Vehicle Birth:

- Procurement commercial truth
- Engineering BOM/Build Specification mutation
- inventory stock balances or warehouse bins
- export shipment execution
- customer ownership and Vehicle 360 lifecycle
- finance/payment settlement

Not yet implemented in Production/Vehicle scope:

- full component consumption ledger and serial tracking beyond explicit deviation evidence
- richer configurable QC checklist templates/evidence assets
- privileged Vehicle identity correction workflow for exceptional real-world mistakes
- Vehicle lifecycle after birth, ownership, dealer/customer handover and Vehicle 360

## Phase 1E — Inventory and Warehouse foundation

Implemented:

- migrations `0006_inventory_warehouse.sql`, `0007_inventory_adjustment_guard.sql` and `0008_inventory_concurrency_guards.sql`
- Inventory quantity truth is an append-only movement ledger; no mutable `on_hand` column is authoritative
- derived PostgreSQL views for location on-hand, active reservations and available quantity
- one inventory model for Engineering Part, Product SKU and serialized Vehicle stock
- warehouse master plus reusable location hierarchy for receiving, storage, staging, pick, quarantine and dispatch
- Germany warehouse, factory staging and future dealer/shipment staging use the same location model rather than separate inventory subsystems
- immutable movement types for Receipt, Transfer, Issue, Return, Adjustment and Stocktake Correction
- unique movement idempotency keys prevent accidental duplicate stock posting
- PostgreSQL guards reject negative stock and reject ordinary movements that would consume active reserved quantity
- PostgreSQL transaction-level advisory locks serialize concurrent writes to the same inventory position; Vehicle operations also take a Vehicle-wide lock across locations
- concurrent last-unit Issue and Reservation races are covered by integration tests so only one conflicting operation can succeed
- reservations are explicit retained facts with Active -> Released / Consumed / Cancelled terminal lifecycle
- reservation-backed Issue validates the reserved item/location/quantity and consumes the reservation in the same database transaction
- serialized Vehicle inventory enforces one current physical inventory location and validates transfer/issue source location
- privileged Adjustment requires explicit reason in both application and PostgreSQL layers
- stocktake sessions use append-only physical count evidence
- closing a stocktake compares the latest count against the ledger-derived balance and creates compensating `STOCKTAKE_CORRECTION` movements instead of overwriting balances
- stocktake reconciliation runs transactionally through the Inventory application contract
- explicit inventory/warehouse permissions and role templates
- authenticated Inventory and Warehouse APIs
- `/inventory` Internal Admin workspace for warehouse/location setup, receipt/transfer/issue/return, reservations, adjustments, derived availability, stocktake and immutable movement history
- PostgreSQL integration tests cover ledger-derived balances, movement immutability, duplicate idempotency, reservation protection/consumption, negative stock, concurrent position writes, serialized Vehicle location and stocktake correction behavior

Deliberately not owned by Inventory/Warehouse:

- Procurement receipt/commercial truth; a Procurement physical receipt is only source evidence until Inventory posts a receipt movement
- Production/QC/Vehicle Birth truth; those domains never write inventory tables directly
- export shipment/customs/milestones
- Shopify fulfillment/order truth
- dealer/customer ownership and handover
- finance valuation, landed cost and GL/accounting representation
- 1688, JackYun/吉客云 or CoffeeBear domestic inventory workflows

Not yet implemented in Inventory/Warehouse scope:

- dedicated putaway task queue and directed putaway rules
- richer pick/pack/dispatch task execution; base locations and Issue movement foundation exist
- replenishment/min-max rules
- lot/batch/serial tracking beyond Vehicle identity
- barcode/scan-first warehouse UX

## Phase 1F — Export Logistics foundation

Implemented:

- migrations `0009_export_logistics.sql`, `0010_logistics_inventory_permissions.sql` and `0011_logistics_integrity_guards.sql`
- one provider-neutral Shipment model with two explicit route types: China factory -> Germany warehouse and China factory -> dealer direct
- database enforcement that export origins are China warehouse locations and Germany-route destinations are Germany warehouse locations
- dealer-direct destination requires a Dealer Partner and an address owned by that Dealer; dealer-direct carries no fake Germany warehouse destination
- optional carrier/forwarder references require the Logistics Provider Partner role
- transport mode, Incoterm, booking, bill of lading, container, tracking and planned ETD/ETA facts kept separate from actual execution events
- append-only Shipment event timeline for booking, cargo readiness, pickup, export/import customs, departure, transit, arrival, delivery, exception and hold/release evidence
- route-specific delivery milestones prevent Germany-delivery events on dealer-direct shipments and dealer-delivery events on Germany routes
- released Shipment route baseline and cargo are protected from silent mutation
- cargo allocation uses the Inventory application contract to create explicit Shipment reservations at the origin location
- Logistics roles receive the exact Inventory/Partner read-write capabilities required for public service contracts rather than bypassing authorization
- Inventory public application methods support caller-owned transactions so Shipment allocation, dispatch and receiving are atomic across domain contracts without direct cross-domain table writes
- Shipment release requires cargo and active Inventory reservations
- dispatch consumes reservations through Inventory Issue movements with deterministic idempotency keys
- serialized Vehicle cargo inherits Inventory collision/availability protection, so one Vehicle cannot be allocated to conflicting active shipments
- Germany delivery and Germany Inventory receiving are separate facts: delivery alone does not create stock
- explicit Germany receive action posts Inventory Receipt movements through the Inventory service and records immutable receiving handoffs
- database guards reject receiving handoffs and Inventory-received markers for dealer-direct shipments
- dealer-direct delivery completes Logistics without requiring or synthesizing a Germany warehouse receipt
- export/import customs declaration headers with exporter, importer and importer-of-record Partner references
- EORI identifiers remain Partner master facts; database validation verifies an EORI identifier belongs to the selected Partner
- commercial invoice, packing-list and customs-document identifiers plus Asset references
- per-cargo origin / HS / CN / TARIC classification facts
- explicit declared value, duty, import VAT, anti-dumping, countervailing and operational-fee facts for later Finance landed-cost integration
- append-only customs events with guarded transitions for Draft, Declared, Hold, Release, Clear, Correction and Cancellation
- customs lines/header become immutable after declaration; correction uses new evidence/events rather than silent history edits
- customs Declared/Cleared/Hold/Release events also emit normalized Shipment milestones
- authenticated Logistics APIs and `/logistics` Internal Admin workspace
- Logistics UI supports route-aware shipment creation, inventory cargo allocation, release/dispatch/cancel, actual milestone timeline, Germany receiving, customs declarations, Partner/EORI selection, classification and duty/VAT/AD/CVD/fee evidence
- PostgreSQL integration tests cover Germany end-to-end execution, delivery-before-receipt separation, dealer-direct no-Germany-receipt behavior, serialized Vehicle allocation collision, EORI ownership and customs/Shipment evidence immutability

Deliberately not owned by Logistics:

- Inventory quantity truth; Logistics uses Inventory public services for reserve/issue/receive
- Partner legal identity, addresses and EORI master truth
- Shopify/storefront order operations
- Dealer commercial policy, customer ownership or Vehicle handover
- Finance AP/AR/payment/settlement and accounting recognition
- Product/Vehicle master identity
- 1688, JackYun/吉客云 or CoffeeBear domestic logistics

Not yet implemented in Logistics scope:

- live carrier/forwarder API connectors and webhook ingestion
- live customs/broker portal connectors
- automated document generation/rendering for commercial invoice, packing list and customs packets
- advanced consolidation/container load planning
- route ETA prediction and exception automation
- warehouse pick/pack task orchestration beyond Inventory reservation/Issue foundations
- Finance landed-cost posting and allocation from the explicit duty/VAT/freight facts

## Planned capability sequence

1. Identity, access, audit and Partner master — **foundation implemented**
2. Product + engineering + asset foundation — **foundation implemented**
3. Procurement + supplier quotation/PO/confirmation/receipts — **foundation implemented**
4. Production + QC + Vehicle Birth — **foundation implemented**
5. Inventory + warehouse operations — **foundation implemented**
6. Export logistics: China -> Germany warehouse and China -> dealer direct — **foundation implemented**
7. Dealer + commerce + Shopify fact synchronization
8. Finance: AR/AP, invoice, payment, allocation, settlement, FX and landed cost
9. Vehicle 360 + ownership + customer garage
10. Service/warranty + parts + repair history
11. Communication Center + email marketing/consent/suppression
12. production deployment, observability, backup/restore and automated release workflow

A capability is considered implemented only when code, persistence, authorization, tests and the required user-visible workflow are present.
