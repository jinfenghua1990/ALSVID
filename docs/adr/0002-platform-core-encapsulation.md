# ADR 0002 — Platform core and enforced domain encapsulation

## Status

Accepted and implemented during the pre-deployment rebuild.

## Context

ALSVID had already separated code into `apps`, `domains` and `packages`, but many domains still placed nearly their entire implementation in `src/index.ts`. That gave the appearance of modularity without a durable internal boundary. Web pages also began duplicating application-shell UI, API controllers accumulated repeated error plumbing, and the worker process existed without a durable execution model.

There is no production deployment or real ALSVID data, so this is the correct time to fix the structure rather than preserve it for compatibility.

## Decision

1. Keep the modular-monolith deployment model.
2. Standardize Domains on `core / application / infrastructure / api` with a facade-only `src/index.ts`.
3. Introduce a minimal provider-free `@alsvid/kernel` rather than duplicating generic errors/context primitives in every Domain.
4. Put external provider interfaces in `@alsvid/ports`; provider SDKs may not leak into core/application code.
5. Treat PostgreSQL as infrastructure. `@alsvid/database` supplies query/transaction mechanics only; Domain SQL belongs to Domain infrastructure adapters.
6. Replace the empty NestJS worker shell with a durable PostgreSQL job runner using leases, retries and idempotency.
7. Add an architecture check to CI so Domain-internal imports and provider leakage cannot silently reappear.
8. Mark pre-rebuild Domains explicitly as `legacy` and migrate them to `encapsulated` before feature expansion resumes.
9. Make `apps/api` the explicit composition root. Domain services are built through public factories/ports, while request context and DomainError-to-HTTP mapping are centralized at the application edge.
10. Propagate request and correlation identifiers into API-originated Audit evidence rather than making each use case manually thread HTTP metadata.
11. Establish `@alsvid/ui` application-shell/navigation primitives so new screens reuse one control-plane structure instead of cloning navigation markup.

## Consequences

- Existing business behavior remains available while internals can evolve behind stable public facades.
- New work has a single architectural pattern.
- Cross-domain dependencies become visible and reviewable.
- HTTP/framework concerns no longer require each Domain or controller to know every other Domain's error types.
- Audit evidence can be traced back to an API request/correlation chain.
- The worker can later host Shopify reconciliation, mail ingestion, AI jobs and long-running workflows without putting those concerns in HTTP request handlers.
- UI work can adopt a shared shell incrementally while keeping business screens functional.
- More files exist per Domain, but each file has a narrow reason to change.

## Rejected

- Microservices now: too much operational complexity for one tightly connected business platform.
- Keep large `index.ts` services: fast initially, but creates hidden coupling and makes provider/database replacement expensive.
- One generic repository/service framework: risks erasing real domain language and moving business rules into a shared abstraction.
- Preserve repeated controller/page plumbing for speed: creates another form of hidden coupling and works against the purpose of the rebuild.
