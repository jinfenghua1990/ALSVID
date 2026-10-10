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

1. **GitHub is the single software source of truth.** Source, contracts, migrations, infrastructure
   definitions and CI live in Git. A deployed environment is reproducible from a commit SHA.
2. **Google Cloud Run is the preferred runtime platform** for the Web, API and Worker containers.
3. **Managed PostgreSQL is the business database.** Structured business facts live there; nothing else
   is authoritative for them.
4. **Cloudflare R2 is the object store** for binary business files. PostgreSQL stores object metadata,
   not bytes.
5. **Google Cloud Secret Manager holds production secrets.** Passwords and configuration secrets are
   read by the runtime and are never committed.
6. **Google Cloud Logging is the log sink**, reached through `@alsvid/observability`.
7. **Backup spans four layers:** GitHub, scheduled database backups, R2, and an offline Q4 copy.
   Restore is exercised, not assumed.
8. **The local M1 workstation is a development environment only.** It is never production and never
   hosts the production database.

## Consequences

- Releases are reproducible and auditable from a commit SHA.
- Secrets stay out of the repository by design, not by discipline alone.
- A lost workstation loses convenience, not business data.
- The stack remains portable: because domain code is provider-neutral, the same software can run
  locally, on Cloud Run, on a VPS or on a home server.
- More than one backup layer must be maintained, which is the intended cost.

## Rejected

- **Running production on a personal computer.** Cheap now, but it makes the business depend on one
  machine being powered on, and it puts the production database behind a desktop.
- **Storing business files in the repository.** Mixes binary data with the software program and makes
  both harder to back up and reason about.
- **Committed environment files as the configuration mechanism.** Turns a private file into a public
  leak waiting to happen.
- **A single cloud provider lock-in in domain code.** Makes the same software unable to run outside
  one platform without rewriting business logic.
- **Deferring the decision until deployment.** The first deployment would then set the architecture by
  accident.
