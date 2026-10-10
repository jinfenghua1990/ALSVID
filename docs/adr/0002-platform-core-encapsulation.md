# ADR 0002 — Platform core and enforced domain encapsulation

## Status

Accepted during the pre-deployment rebuild.

## Context

ALSVID had already separated code into `apps`, `domains` and `packages`, but many domains still placed nearly their entire implementation in `src/index.ts`. That gave the appearance of modularity without a durable internal boundary. Web pages also began duplicating application-shell UI, and the worker process existed without a durable execution model.

There is no production deployment or real ALSVID data, so this is the correct time to fix the structure rather than preserve it for compatibility.

## Decision

1. Keep the modular-monolith deployment model.
2. Standardize domains on `core / application / infrastructure / api` with a facade-only `src/index.ts`.
3. Introduce a minimal provider-free `@alsvid/kernel` rather than duplicating generic errors/context primitives in every domain.
4. Put external provider interfaces in `@alsvid/ports`; provider SDKs may not leak into core/application code.
5. Treat PostgreSQL as infrastructure. `@alsvid/database` supplies query/transaction mechanics only; domain SQL belongs to domain infrastructure adapters.
6. Replace the empty NestJS worker shell with a durable PostgreSQL job runner using leases, retries and idempotency.
7. Add an architecture check to CI so domain-internal imports and provider leakage cannot silently reappear.
8. Mark pre-rebuild domains explicitly as `legacy` and migrate them to `encapsulated` before feature expansion resumes.

## Consequences

- Existing business behavior can remain while internals are replaced incrementally.
- New work has a single architectural pattern.
- Cross-domain dependencies become visible and reviewable.
- The worker can later host Shopify reconciliation, mail ingestion, AI jobs and long-running workflows without putting those concerns in HTTP request handlers.
- More files are created per domain, but each file has a narrow reason to change.

## Rejected

- Microservices now: too much operational complexity for one tightly connected business platform.
- Keep large `index.ts` services: fast initially, but creates hidden coupling and makes provider/database replacement expensive.
- One generic repository/service framework: risks erasing real domain language and moving business rules into a shared abstraction.
