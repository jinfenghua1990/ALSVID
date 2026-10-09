# ALSVID Product Architecture

Status: durable standalone product direction.

This document preserves product rules that remain valid after ALSVID became an independent application. It must be read together with `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE.md` and `docs/DATA_OWNERSHIP.md`.

## 1. Product principle

ALSVID is an independent bicycle-brand operating platform. Product definition, physical bicycle identity, dealer/customer relationships and service history share one authoritative ALSVID domain model; different entrances are projections over those facts, not separate masters.

Non-negotiable rules:

1. One physical bicycle = one canonical `Vehicle`.
2. `frame_number` is permanent, immutable and unique.
3. A physical bicycle must exist as a Vehicle no later than factory outbound.
4. Product/Model/Variant/BOM define what may be built; Vehicle identifies what was actually built.
5. Released birth/build evidence for an existing Vehicle is immutable.
6. Material lifecycle, custody, ownership, warranty and service history is additive/auditable.
7. Dealer and customer identities attach to canonical Partner records rather than duplicate masters.
8. Shopify remains the external OMS.
9. Internal Admin, Dealer Portal, My ALSVID and public/service flows use the same authoritative ALSVID facts with different authorization scopes.
10. Hardware-dependent features remain future extensions until real hardware/integrations exist; never simulate GPS, remote lock, OTA, telemetry or battery-health data.

## 2. Product operating centers

The internal ALSVID product uses one primary navigation layer:

- 工作台
- 产品中心
- 供应链中心
- 经销商中心
- 客户中心
- 车辆中心
- 售后中心
- 财务中心

Do not create a permanent second navigation bar that repeats backend modules.

### 工作台

Action-led owner/admin view answering “what needs attention today?”: pending work, exceptions, lifecycle gaps, dealer/customer/service signals and concise operating metrics.

### 产品中心

Owns the product/engineering experience:
- FC / FT / CT / GT platforms;
- FC1 / FT1 / CT1 / GT1 and future variants/PRO editions;
- Product/SKU mapping;
- Parts and released BOM revisions;
- colors/editions/market variants;
- images, manuals, exploded views, 3D/GLB, video and approved dealer/service documents.

A new BOM revision must never rewrite an existing Vehicle birth snapshot.

### 供应链中心

ALSVID-specific export supply chain, designed independently from DOMESTIC workflows:
- supplier/procurement;
- production/factory batches;
- factory outbound;
- inbound/receiving;
- warehouse stock;
- international logistics;
- China factory -> Germany warehouse;
- China factory -> dealer direct shipment.

Quantity/inventory facts and serialized Vehicle lifecycle complement each other. A bicycle batch must ultimately resolve its physical units to canonical frame numbers/Vehicle records.

### 经销商中心

Dealer 360 and channel lifecycle:
- profile, authorization, territory and contacts;
- sales/service capability;
- vehicles in transit, received, in custody, pending handover, sold and in service;
- PDI and handover workflow;
- approved assets/documents;
- dealer-specific commercial relationships where authorized.

### 客户中心

Buyer/customer lifecycle rather than a generic address book:
- identity/contact, country/language;
- current and former ALSVID Vehicles;
- purchase/dealer references;
- warranty and service history;
- owned/compatible accessories where supported;
- interactions;
- explicit marketing-consent evidence and withdrawal state.

Vehicle registration, warranty or service activity never implies marketing consent.

### 车辆中心

First-class serialized fleet authority:
- frame-number-first search;
- Vehicle 360;
- current state/custodian/owner;
- factory/birth facts;
- immutable build snapshot;
- lifecycle timeline;
- original/current serialized components where implemented;
- warranty/service references.

### 售后中心

Warranty and ServiceCase operations always resolve a canonical Vehicle first. Preserve an append-oriented digital service book, diagnosis/resolution history, service parts and service provider/dealer facts.

### 财务中心

ALSVID export/commercial finance only: invoices, payments, receivables/payables, reconciliation, tax and close facts required by ALSVID operations. It must be designed for ALSVID export scope and must not import the DOMESTIC accounting workflow wholesale.

## 3. Canonical chain

```text
Product / SKU
    |
Platform / Model / Variant / released BOM
    |
Factory build / production batch
    |
Vehicle (unique frame_number)
    |
+-- immutable birth/build snapshot
+-- serialized component history
+-- lifecycle events
+-- dealer/custody history
+-- customer/ownership history
+-- warranty
+-- service cases / digital service book
+-- QR/claim relationship
```

The same Vehicle may appear in Internal Vehicle 360, Dealer Portal, My Garage, service views, model fleet views and recall views. Those are projections, not duplicate databases.

## 4. Factory origin and build evidence

By factory outbound the Vehicle must exist. Target facts include:
- frame number;
- model / SKU / variant;
- production batch/reference;
- factory/source;
- production/completion date where available;
- outbound timestamp/reference;
- released BOM revision/build specification;
- critical serialized components where supplied.

Long-term configuration model distinguishes:
- original/birth configuration: immutable historical evidence;
- current configuration: derived from approved component replacement events.

## 5. Serialized components and battery identity

Safety-, warranty- or recall-relevant replaceable components may become serialized instances, including battery, motor, controller and display.

Replacement is historical:

```text
old component -> replacement event -> new component
```

Battery is not Vehicle. A replacement battery does not change Vehicle identity.

Keep two QR concepts separate:
1. Vehicle QR: activation/My ALSVID/warranty/service entry.
2. Battery regulatory QR/passport: battery-specific regulatory identity when applicable.

ALSVID targets the EU, so the architecture must remain ready for applicable EU battery-passport requirements. Legal deadlines/required fields must be re-verified against then-current law before production implementation.

## 6. Lifecycle and ownership

Material lifecycle vocabulary includes:

`FACTORY_REGISTERED`, `FACTORY_OUTBOUND`, `IN_TRANSIT`, `WAREHOUSE_RECEIVED`, `DEALER_RECEIVED`, `DEALER_TRANSFERRED`, `PDI_COMPLETED`, `RETAIL_SOLD`, `CUSTOMER_BOUND`, `ACTIVATED`, `WARRANTY_STARTED`, `SERVICE_OPENED`, `SERVICE_COMPLETED`, `COMPONENT_REPLACED`, `OWNERSHIP_TRANSFERRED`, `LOST_REPORTED`, `STOLEN_REPORTED`, `RECOVERED`, `RECALL_AFFECTED`, `RECALL_REMEDIATED`.

Ownership transfer changes the current relationship, not Vehicle identity. Keep ownership history and technical service history while protecting previous-owner personal data.

Lost/stolen/recovered status is a lifecycle/security fact; do not claim live location unless real hardware/integration provides it.

## 7. Recall and traceability

ALSVID must eventually answer which exact Vehicles are affected by a model/BOM revision/production batch/serialized component issue, their current responsible dealer/customer relationship, and whether remediation is complete.

Recall campaigns reference canonical Vehicles rather than creating a shadow fleet master.

## 8. QR architecture

Vehicle QR is an access pointer, never the canonical identity.

```text
opaque/random token
    -> narrow activation/lookup service
    -> authorization/verification
    -> existing Vehicle
```

Rules:
- never encode an internal DB primary key as authority;
- scanning must not create a new Vehicle;
- QR replacement/reissue does not change Vehicle identity;
- claim/revocation/reissue should be auditable;
- public disclosure follows least privilege.

## 9. My ALSVID direction

Phase 1 is mobile-first web/PWA; a native app is not required.

My Garage should evolve toward:
- multiple Vehicles per owner;
- model/photo/color;
- frame number with appropriate privacy treatment;
- registration/authenticity state;
- purchase/dealer references;
- warranty;
- manuals/documents;
- compatible parts/accessories;
- customer-safe service history;
- open service/warranty cases;
- dealer/service contact;
- later ownership transfer.

## 10. Future connected-bike boundary

Reserve integration boundaries for future real capabilities such as diagnostics, OTA, telemetry, battery health, GPS and remote lock. They are not prerequisites for the current platform and must not be presented as implemented without real hardware and verified integrations.
