# ALSVID Current State

Status: standalone authority after zero-data cutover decision.

This file is durable project memory for human and AI contributors. If extraction-era migration notes conflict with this file, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_OWNERSHIP.md` and this file are authoritative for current work.

## Authority

- `jinfenghua1990/ALSVID` is the sole long-term implementation authority for ALSVID.
- `jinfenghua1990/ChaiBen-OS` is not an ALSVID application boundary. Its legacy ALSVID runtime is being retired and must not receive new ALSVID features.
- There is no GLOBAL/DOMESTIC/ALSVID workspace switch in the ALSVID architecture.
- 1688, JackYun/吉客云 and 卖咖啡的熊 are DOMESTIC-only and must never enter ALSVID runtime packages.

## Zero-data cutover decision

The legacy ChaiBen-OS ALSVID workspace has no business data that needs preservation. Therefore:

- standalone ALSVID starts from its own clean PostgreSQL schema and bootstrap data;
- no source-to-target business-row migration is required for production cutover;
- legacy data-cutover tooling remains historical/contingency tooling only and is not a release blocker;
- future contributors must not invent dummy legacy business data merely to exercise a migration path.

## Implemented standalone capabilities

The standalone repository already owns:

- authentication, roles, permissions and sessions;
- Product/SKU foundation;
- FC / FT / CT / GT engineering models;
- Parts, BOM and released BOM revisions;
- R2/S3-compatible asset metadata, upload verification and signed/public access services;
- Vehicle identity, immutable frame number and lifecycle authority;
- Vehicle Center / Vehicle 360 API;
- Dealer Portal workflows;
- My ALSVID claim, Garage and marketing-consent evidence;
- Warranty and ServiceCase domain;
- Customer Center and Service Center APIs.

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
- ALSVID may map/import confirmed facts and external references but must not rebuild Shopify order management.

## Not yet equivalent to “the whole future ALSVID company platform is finished”

The clean extraction completed existing ALSVID-specific capabilities. The following are future ALSVID product development, not missing migration work:

- polished standalone Internal Admin UI;
- ALSVID-specific procurement and production workflows;
- China factory -> Germany warehouse and China factory -> dealer direct-shipping flows;
- export warehouse/inventory/logistics capabilities;
- export/commercial finance capabilities;
- production deployment, live PostgreSQL environment and live R2 credentials;
- deeper Shopify and future EU logistics/payment/tax integrations.

When these are built, they must be designed for ALSVID export operations rather than copied from DOMESTIC workflows.

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
