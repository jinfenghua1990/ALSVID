# ALSVID Current State

Status: standalone authority; ChaiBen-OS runtime retired.

This file is durable project memory for human and AI contributors. If extraction-era migration notes conflict with this file, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_OWNERSHIP.md` and this file are authoritative for current work.

## Authority

- `jinfenghua1990/ALSVID` is the sole long-term implementation authority for ALSVID.
- `jinfenghua1990/ChaiBen-OS` no longer hosts an active ALSVID runtime and must not receive new ALSVID features.
- There is no GLOBAL/DOMESTIC/ALSVID workspace switch in the ALSVID architecture.
- 1688, JackYun/吉客云 and 卖咖啡的熊 are DOMESTIC-only and must never enter ALSVID runtime packages.
- Shopify remains the external OMS. ALSVID stores confirmed commercial facts and external references, not a second general OMS.

## Zero-data cutover decision

The legacy ChaiBen-OS ALSVID workspace had no business data that required preservation. Therefore:

- standalone ALSVID starts from its own PostgreSQL schema and bootstrap data;
- no production business-row migration from ChaiBen-OS is required;
- legacy cutover tooling is historical/contingency tooling only and is not a release blocker;
- future contributors must not invent dummy legacy business data merely to exercise a migration path.

## Implemented standalone capabilities

The standalone repository owns:

- authentication, roles, permissions and sessions;
- Product / SKU foundation;
- FC / FT / CT / GT engineering models;
- Parts, BOM and released BOM revisions;
- R2/S3-compatible asset metadata, upload verification and signed/public access services;
- Vehicle identity, immutable frame number and lifecycle authority;
- Vehicle Center / Vehicle 360 API;
- Dealer Portal workflows;
- My ALSVID claim, Garage and marketing-consent evidence;
- Warranty and ServiceCase domain;
- Customer Center and Service Center APIs;
- commercial channels and external order facts;
- export shipment facts and milestone tracking;
- ALSVID-owned commercial finance facts;
- ALSVID inventory locations and append-only inventory movements;
- dealer inventory reservations;
- EU export/import compliance facts including importer/EORI, customs classification, duty, import VAT, port/last-mile fees and export-refund facts.

These are current ALSVID authorities. Do not recreate parallel masters in a new UI or integration.

## Infrastructure contract

### PostgreSQL

- PostgreSQL stores authoritative ALSVID business facts and asset metadata.
- Database connection comes from `ALSVID_DATABASE_URL`.
- Schema changes go through the repository's Alembic chain; do not deploy with `Base.metadata.create_all()`.
- Live database credentials/URLs are deployment secrets and must not be committed to Git.

### R2 / S3-compatible object storage

- Binary images, videos, manuals, 3D/GLB and other files live in R2/S3-compatible object storage.
- PostgreSQL stores object metadata, ownership, visibility, hashes and references.
- R2 settings use `ALSVID_R2_*` environment variables.
- Live R2 credentials are deployment secrets and must never be committed.
- Browser-facing flows use dedicated object-storage APIs and signed URLs; credentials never reach the browser.

### Shopify

- Shopify remains external OMS.
- ALSVID may map/import confirmed order facts and external references but must not rebuild Shopify order management.
- Internal shipment, inventory, dealer reservation, vehicle, warranty and service facts remain ALSVID-owned even when an external order originates in Shopify.

## Still future product development

The standalone platform is not yet the finished future company platform. Remaining product development includes:

- polished standalone Internal Admin UI;
- ALSVID-specific procurement and factory production workflows;
- explicit China factory -> Germany warehouse execution workflow;
- explicit China factory -> dealer direct-shipping execution workflow;
- richer warehouse operations and stocktake/transfer controls on top of the current inventory ledger;
- deeper Shopify synchronization and reconciliation;
- live EU logistics/payment/tax integrations;
- production deployment, live PostgreSQL environment and live R2 credentials.

These are new ALSVID product work, not missing ChaiBen migration work. They must be designed for ALSVID export operations rather than copied from DOMESTIC workflows.

## Migration / deletion rule

Repository split follows “migrate one, delete one”:

1. finish the standalone replacement and tests;
2. cut over data/API/runtime authority;
3. delete the old runtime code, routes, UI, tests and misleading docs for that capability from the previous repository;
4. do not keep dual authority or long-lived compatibility shells.

Historical Alembic revisions are database upgrade history, not active business authority. They may be removed only after a safe baseline/cutover is established.

## Canonical business rules

- One physical bicycle = one canonical Vehicle.
- `frame_number` is immutable and globally unique inside ALSVID.
- Product definition is not Vehicle identity.
- Vehicle birth/build evidence freezes released BOM/build facts.
- Material lifecycle history is append-only and sequence-validated.
- Dealer/customer are relationships to canonical Partner identities, not duplicate masters.
- Warranty and ServiceCase are canonical after-sales authorities.
- External IDs are mappings, never canonical primary keys.
- Money uses PostgreSQL NUMERIC / Python Decimal, never float.
- Hidden UI is never authorization; backend scope is authoritative.

## Contributor startup checklist

Before meaningful ALSVID work:

1. Read latest `main`.
2. Read `AGENTS.md`.
3. Read this file.
4. Read `docs/ARCHITECTURE.md` and `docs/DATA_OWNERSHIP.md`.
5. Check relevant Issue/PR and current code before creating a second implementation.
6. Treat migration inventory/cutover docs as historical extraction records unless a current Issue explicitly reactivates them.