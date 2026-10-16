# Domain Structure Contract

ALSVID is a modular monolith. A directory named `domains/foo` is not considered encapsulated merely because it is a separate package.

## Required shape

Every fully rebuilt business domain uses:

```text
domains/<domain>/
  domain.json
  package.json
  src/
    index.ts               # public facade only
    core/                  # pure domain language and invariants
    application/           # use cases, ports, orchestration
    infrastructure/        # PostgreSQL/provider implementations
    api/                   # transport-neutral DTO/contracts
```

`src/index.ts` is intentionally boring. It re-exports the supported public surface and contains no SQL, state machine implementation or provider code.

## Layer rules

### core

May contain entities, value objects, invariant functions, state-transition rules and domain-specific error types. It must not import NestJS, Next.js, PostgreSQL, Shopify, R2/S3, mail, AI or other provider SDKs.

### application

Owns commands, queries and use-case orchestration. It depends on `core` and on small interfaces/ports. It must not know which external vendor or database driver implements those ports.

### infrastructure

Implements persistence and provider-facing ports. PostgreSQL SQL belongs here when it is domain-specific. Provider SDK imports belong here or in a dedicated platform adapter package.

### api

Contains transport-neutral request/response contracts when a domain needs them. NestJS controllers remain in `apps/api`; Next.js surfaces remain in `apps/web`.

## Public imports

Other packages import a domain only through:

```ts
import { Something } from '@alsvid/<domain>';
```

Imports such as `@alsvid/product/src/infrastructure/...` are forbidden and CI rejects them.

## Cross-domain behavior

A domain may read or invoke another domain only through that domain's public application contract. It must never mutate another domain's PostgreSQL tables directly.

Dashboard/360 projections may join across schemas for reads, but a projection is never a write authority.

## Platform packages

- `@alsvid/kernel` — tiny provider-free primitives and standardized domain errors
- `@alsvid/ports` — provider-neutral object storage, AI, mail and job interfaces
- `@alsvid/database` — PostgreSQL connection/transaction contract, not business repositories
- `@alsvid/observability` — structured logging interface/implementation
- `@alsvid/jobs` — durable PostgreSQL-backed execution mechanics, not business workflow rules
- `@alsvid/config` — validated runtime configuration
- `@alsvid/ui` — shared visual/application-shell primitives

No package is allowed to become a generic dumping ground for business entities.

## Migration mode

Existing domains created before the rebuild are marked `mode: legacy` in `domain.json`. They may continue to run while being moved behind the contract above, but no new feature work should enlarge legacy files. A domain is marked `encapsulated` only when its real implementation follows the four-layer structure and its public facade is small.

Issue #20 completed the implemented-domain encapsulation gate. New work follows the backlog and keeps this contract; do not reopen the historical global feature freeze or expand a legacy implementation.
