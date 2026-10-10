# ALSVID Domains

Business behavior lives in domain packages. Directory separation alone is not enough: every rebuilt domain follows `docs/DOMAIN_STRUCTURE.md`.

`domain.json` declares the domain's schema ownership, allowed cross-domain dependencies and migration status:

- `legacy` — existing working implementation still needs internal restructuring; no new feature growth should be added there.
- `encapsulated` — real implementation follows `core / application / infrastructure / api`, with a facade-only `src/index.ts`.

Feature development remains frozen while the existing baseline domains are moved from legacy to encapsulated.
