# ADR 0001 — Clean-slate modular monolith

- Status: Accepted
- Date: 2026-10-10

## Context

The previous ALSVID implementation was never adopted as a real local/production business system and contains no business data that requires compatibility. ChaiBen-OS also mixed unrelated domestic and ALSVID concerns historically.

## Decision

ALSVID-Next is a clean-slate implementation.

We will:

- use TypeScript end-to-end
- build web surfaces with Next.js/React
- build the application API with NestJS
- run async/integration work in a worker process
- use PostgreSQL as structured system of record
- use S3-compatible object storage for binary assets
- organize implementation by business domains within a modular monolith
- begin a new database migration lineage at 0001

We will not copy old runtime code/migrations or build compatibility layers merely to preserve undeployed behavior.

## Consequences

Positive:

- no historical schema debt
- clearer business boundaries
- simpler developer/agent mental model
- easier consistent UI/API/contracts
- freedom to correct old design mistakes before real data exists

Trade-offs:

- old endpoints are not guaranteed to exist
- previous code cannot be assumed reusable
- important old business rules must be deliberately rediscovered/documented rather than accidentally inherited

## Future change

Splitting a domain into a network service or introducing a durable workflow engine requires a later ADR with a concrete operational justification.
