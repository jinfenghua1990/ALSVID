# Current State

## Status

ALSVID-Next is a clean-slate implementation created on 2026-10-10. No production or local business deployment exists yet and no real ALSVID business data needs backward compatibility.

The repository is therefore free to optimize architecture, schemas, APIs and user experience before the first real deployment.

## Current priority — platform rebuild and encapsulation

Feature expansion is temporarily frozen.

The immediate priority is to rebuild the ALSVID codebase as a durable platform core before adding more business capability. Existing business modules on `main` are treated as validated business requirements and working reference implementations, not as untouchable architecture.

The rebuild must:

- standardize every Domain around `core / application / infrastructure / api` boundaries
- keep `src/index.ts` as a public facade only, never as the implementation home for an entire Domain
- centralize shared primitives, errors, transaction contracts, IDs, clocks and pagination without creating a generic business-data dumping ground
- keep PostgreSQL schema ownership explicit per Domain
- prevent applications from importing Domain internals directly
- prevent one Domain from directly mutating another Domain's tables
- provide provider-neutral ports for storage, external integrations, AI providers and jobs/workflows
- standardize API error mapping, validation, authorization, audit metadata and idempotency
- standardize the Web application shell, navigation and reusable UI components before adding more screens
- standardize Worker jobs/outbox execution before adding automation
- add architecture checks to CI so the structure cannot silently collapse back into large mixed files

Until this rebuild is merged, no new Finance, Vehicle 360, Service, Communication or other feature expansion should be merged.

## Existing capability baseline

The following capabilities exist on `main` and remain available as business-behavior references during the rebuild:

- Identity / access / audit / Partner master
- Product / Engineering / Assets
- Procurement
- Production / QC / Vehicle Birth
- Inventory / Warehouse
- Export Logistics
- Dealer / Commerce / Shopify fact synchronization

Their behavior may be retained while their internal code is reorganized.

## Rebuild acceptance gate

Feature development resumes only after:

1. the new platform-core packages are established
2. Domain directory contracts are documented and CI-enforced
3. API composition and error handling are centralized
4. database transaction and migration boundaries are standardized
5. provider-neutral integration/storage/job ports exist
6. Web shell/design-system foundation is shared rather than copied per page
7. at least the existing implemented Domains conform to the new public/internal boundary rules
8. migrations, tests, typecheck and build all pass from an empty PostgreSQL 18 database

## Authority

This repository is the implementation authority for the new ALSVID codebase. The previous ALSVID and ChaiBen-OS repositories are historical requirement sources only and must not be treated as code dependencies.

## Product boundary

ALSVID is the integrated operating platform for the bicycle/export business. CoffeeBear domestic workflows, including 1688 and JackYun/吉客云, remain outside ALSVID.
