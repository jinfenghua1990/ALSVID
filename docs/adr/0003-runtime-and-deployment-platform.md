# ADR 0003 — Runtime, deployment and secret authority

## Status

Accepted.

## Context

ALSVID-Next is a clean-slate implementation with no production deployment and no real business data
yet. Before the first deployment, the project needs one fixed answer to a set of questions that would
otherwise be re-litigated during every release:

- where the software program lives
- where the software runs
- where business data lives
- where business files live
- where production credentials live
- where logs go
- what is backed up and how
- what role a personal computer plays

The risk of leaving this open is concrete: a temporary hosting decision, a password placed in an
environment file, or a database kept on a workstation can each become permanent by accident.

## Decision

1. **The existing local checkout is the primary day-to-day working copy; GitHub is secondary for
   synchronization, history, review, CI and release.** Compare both sides before syncing and preserve
   their changes. A deployed environment remains reproducible from the reviewed release commit SHA.
2. **Google Cloud Run is the selected runtime platform** for the Web, API and Worker containers.
3. **Neon managed PostgreSQL is the selected production database provider.** PostgreSQL remains the
   application/database contract and authoritative store for structured business facts. Domain code
   must not depend on Neon-specific business semantics, so another PostgreSQL provider can replace
   Neon without rewriting Domain rules.
4. **Cloudflare R2 is the object store** for binary business files. PostgreSQL stores object metadata,
   not bytes. Concrete provider code stays behind the object-storage port.
5. **Google Cloud Secret Manager holds production secrets.** Passwords and configuration secrets are
   read by the runtime and are never committed.
6. **Google Cloud Logging is the log sink**, reached through `@alsvid/observability`.
7. **Backup spans four layers:** GitHub, Neon/PostgreSQL backup, R2, and an offline Q4 copy.
   Restore is exercised, not assumed.
8. **The local M1 workstation is a development/Test environment only.** It is never production and
   never hosts the production database authority.
9. **Mail and AI remain provider-neutral until concrete providers are selected.** Business domains
   depend on ports, never vendor SDKs. AI output is assistance rather than authoritative business truth.
10. **Shopify or another external OMS remains external.** ALSVID does not own storefront order,
    payment, split-order, warehouse allocation or fulfillment orchestration.
11. **Public product pages share one Web runtime.** Product/model pages are routes and content in the
    Next.js Web application deployed as Cloud Run Service `alsvid-web`; they are not separate runtime
    services. Shared application APIs use `alsvid-api`. A per-product Cloud Run service requires a
    new owner-approved ADR and a demonstrated operational need.

Selecting a provider in this ADR records architecture intent; it does not assert that the provider's
live account resources have already been provisioned. Live Neon, R2 and Google Cloud resources require
separate production acceptance evidence under Issue #34.

## Consequences

- Releases are reproducible and auditable from a commit SHA.
- Secrets stay out of the repository by design, not by discipline alone.
- A lost workstation loses convenience, not business data.
- The stack remains portable: because Domain code is provider-neutral, the same software can run
  locally, on Cloud Run, on a VPS or on a home server.
- Neon can be replaced by another PostgreSQL provider without changing business rules.
- R2 can be replaced by another S3-compatible object store behind the same port.
- Mail and AI provider choices can be made later without reopening the core architecture.
- More than one backup layer must be maintained, which is the intended cost.

## Rejected

- **Running production on a personal computer.** Cheap now, but it makes the business depend on one
  machine being powered on, and it puts the production database behind a desktop.
- **Storing business files in the repository.** Mixes binary data with the software program and makes
  both harder to back up and reason about.
- **Committed environment files as the configuration mechanism.** Turns a private file into a public
  leak waiting to happen.
- **A single cloud provider lock-in in Domain code.** Makes the same software unable to run outside
  one platform without rewriting business logic.
- **Making ALSVID a replacement OMS.** Storefront order/payment/fulfillment orchestration remains an
  external commerce responsibility.
- **Deferring the decision until deployment.** The first deployment would then set the architecture by
  accident.
