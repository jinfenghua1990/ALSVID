# ALSVID Agent Constitution

These rules are mandatory for all human and AI contributors.

## 1. Repository purpose

`jinfenghua1990/ALSVID` is the standalone long-term codebase for the ALSVID bicycle business. It is not a DOMESTIC workspace and must not depend on the ChaiBen-OS multi-workspace runtime.

## 2. Pre-work protocol

Before meaningful code changes:
1. Read latest `main`.
2. Read this file.
3. Read `docs/ARCHITECTURE.md`.
4. Read `docs/DATA_OWNERSHIP.md`.
5. Read `docs/MIGRATION_INVENTORY.md` while extraction is active.
6. Check relevant Issue/PR before creating a second implementation.
7. Meaningful feature/fix work uses Issue -> branch -> PR.

## 3. Migration rule

Extraction from ChaiBen-OS is **rewrite-while-migrating**, not copy-and-freeze.

Preserve validated business invariants, but rewrite code when it contains:
- `chaiben.*` package coupling;
- GLOBAL/DOMESTIC/ALSVID workspace switching that no longer applies;
- 1688 or JackYun dependencies;
- assumptions that ALSVID is only a view over another repository;
- duplicated business authority;
- ambiguous event ordering or lifecycle logic;
- stale naming or architecture comments.

Do not delete the source implementation from ChaiBen-OS until the corresponding standalone capability is verified here.

## 4. Frozen domain rules

- One physical bicycle = one canonical Vehicle.
- `frame_number` is immutable and globally unique within ALSVID.
- Vehicle creation happens no later than factory outbound.
- Product definition and physical Vehicle identity are separate.
- Released BOM/build evidence for an existing Vehicle is immutable.
- Material lifecycle history is append-only/auditable.
- Dealer and customer are relationships to canonical partner identities, not duplicate masters.
- Warranty and ServiceCase are canonical after-sales authorities.
- Shopify remains external OMS; do not recreate Shopify order management.
- Binary files live in R2/S3-compatible object storage; database stores metadata.
- External IDs are mappings only.
- Money uses PostgreSQL NUMERIC / Python Decimal, never float.
- Schema changes require migrations.

## 5. Product boundary

Runtime/UI code must not introduce DOMESTIC-only integrations or concepts. Specifically, 1688 and 吉客云/JackYun are prohibited from ALSVID runtime packages unless a future explicit architecture decision changes the boundary.

## 6. Entrances and authorization

Internal Admin, Dealer Portal, My ALSVID and public/service routes may present different experiences, but they must use the same authoritative domain records. Hidden UI is never authorization; backend scope is authoritative.

## 7. Testing

Every migrated domain must retain or improve regression coverage. Vehicle lifecycle changes require explicit tests for event order, duplicate frame rejection, dealer custody, PDI/handover sequencing, ownership changes and immutable birth facts.

## 8. Destructive changes

Source deletion, data migration, stable-ID changes, authentication, finance, inventory-ledger semantics and production deployment are high-risk. Stage and verify before destructive changes.

## 9. Project memory

GitHub Issues, PRs and repository docs are durable project memory. Chat is not the authoritative implementation record.
