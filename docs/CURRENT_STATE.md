# Current State

## Status

ALSVID-Next is a clean-slate implementation created on 2026-10-10. No production or local business deployment exists yet and no real ALSVID business data needs backward compatibility.

The repository is therefore free to optimize schemas, APIs and user experience before the first real deployment, but the platform-core architecture is now established and should be treated as the default implementation standard.

## Platform rebuild — complete

The pre-deployment platform rebuild and encapsulation gate is complete.

All currently implemented business Domains now use the standard internal boundary:

```text
core / application / infrastructure / api
```

`src/index.ts` is a public facade rather than the implementation home for a Domain. Every implemented Domain is marked `encapsulated`, and CI runs `pnpm arch:check` to prevent internal imports, provider leakage and a return to large mixed Domain files.

The platform core now includes:

- `@alsvid/kernel` for provider-free shared errors, operation context, clocks and pagination
- `@alsvid/database` query and transaction contracts while Domain SQL remains inside Domain infrastructure adapters
- `@alsvid/ports` for provider-neutral object storage, AI, email and workflow/job integrations
- `@alsvid/observability` structured logging
- `@alsvid/jobs` PostgreSQL-backed durable jobs with leases, retries and idempotency
- `apps/worker` as a real durable-job runner rather than an empty service shell
- centralized API runtime composition
- global DomainError-to-HTTP mapping
- request ID and correlation ID propagation
- request/correlation metadata automatically inherited by API-originated Audit records
- reusable Web application-shell/navigation primitives in `@alsvid/ui`
- shared application navigation instead of defining the control-plane map independently on every new screen

## Verified architecture gate

The architecture gate is considered complete only when the repository passes all of the following together:

1. PostgreSQL migrations rebuild from an empty PostgreSQL 18 database
2. the migration command is safe to run again with nothing pending
3. `pnpm arch:check` passes with no legacy Domain warnings
4. all workspace TypeScript checks pass
5. all existing PostgreSQL integration tests pass
6. all Web/API/Worker/packages build successfully

These checks remain CI requirements for subsequent work.

## Existing capability baseline

The following capabilities are preserved through the rebuild and remain the current implemented business baseline:

- Identity / access / audit / Partner master
- Product / Engineering / Assets
- Procurement
- Production / QC / Vehicle Birth
- Inventory / Warehouse
- Export Logistics
- Dealer / Commerce / Shopify fact synchronization

The rebuild changed internal boundaries and composition, not these business semantics.

## Feature development after the rebuild

Feature development may resume only through the new platform contracts. New work must not reintroduce direct cross-Domain persistence access, provider SDKs in core/application code, duplicated application composition, or large mixed `src/index.ts` implementations.

Finance, Vehicle 360, Service, Communication and other later roadmap capabilities are still not implemented merely because the architecture gate is complete. They remain separate feature work and must be implemented on top of the encapsulated platform.

## Authority

This repository is the implementation authority for the new ALSVID codebase. The previous ALSVID and ChaiBen-OS repositories are historical requirement sources only and must not be treated as code dependencies.

## Product boundary

ALSVID is the integrated operating platform for the bicycle/export business. CoffeeBear domestic workflows, including 1688 and JackYun/吉客云, remain outside ALSVID.
