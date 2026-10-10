# Architecture

## Goal

Build ALSVID as a durable enterprise operating platform without making early deployment unnecessarily complex.

## System shape

ALSVID starts as a **modular monolith** with three deployable processes in one monorepo:

- `apps/web` — Next.js user surfaces
- `apps/api` — NestJS application/API runtime
- `apps/worker` — asynchronous jobs, external synchronization, AI-assisted processing and long-running workflow execution

They share contracts and libraries but do not share arbitrary mutable state.

## Why modular monolith first

ALSVID has strongly connected workflows: procurement creates production demand, production creates inventory/vehicles, logistics moves stock, commerce creates receivables, payments settle obligations, and after-sales depends on the exact vehicle/build history. Splitting these into network services before the domain model stabilizes would increase operational cost and make consistency harder.

A domain may become an independent service later only when an ADR demonstrates a concrete need such as independent scaling, security isolation, team ownership or external SLA.

## Domain structure

Each domain should converge on this internal shape:

```text
domains/<domain>/
  src/
    core/             # entities, value objects, invariants, policies
    application/      # commands, queries, orchestration, ports
    infrastructure/   # persistence and external adapters
    api/              # transport-facing DTO/controller glue when needed
```

Core code must not depend on framework-specific or provider-specific SDKs.

## Domain map

- Identity & Access — users, memberships, roles, permissions, sessions
- Partners — supplier/factory/dealer/customer/service/logistics identity and roles
- Product — platforms, models, variants, SKUs, commercial identity
- Engineering — parts, BOM revisions, build specifications, technical release
- Procurement — RFQ/quote/PO/receipts/supplier commitments
- Production — production orders, assembly, QC, release and vehicle birth
- Inventory — stock movement ledger, availability and reservation
- Warehouse — receiving, putaway, bins, transfer, stocktake, pick/pack/dispatch
- Logistics — export shipments, customs and delivery milestones
- Commerce — channels, external orders, fulfillment mapping, returns
- Finance — invoices, obligations, payments, allocations, landed cost, FX, settlement
- Vehicle — unique physical bicycle identity, lifecycle and ownership history
- Dealer — dealer operations, allocations, handover and dealer inventory views
- Customer — customer profile, garage, ownership, preferences
- Service — warranty, service cases, repair events, replacement parts
- Communication — provider-neutral messages/threads/drafts/attachments
- Marketing — consent, suppression, segments, campaigns and send history
- Assets — object metadata, access policy and business linkage
- Integrations — provider adapters and synchronization control plane
- Audit & Compliance — immutable audit/security/compliance evidence

## Data

PostgreSQL is authoritative for structured business facts. Tables are owned by domains.

Cloudflare R2 or another S3-compatible provider stores binary assets. Database rows store object key, bucket/provider, checksum, media metadata, classification, visibility and business relationships.

## Cross-domain interaction

Use one of three patterns:

1. direct in-process application contract for synchronous invariants
2. domain event/outbox for eventual side effects and integrations
3. read-model projection for dashboards and 360-degree views

Never solve cross-domain behavior with direct writes to another domain's tables.

## Long-running workflows

Procurement-to-delivery may span months. Workflow state must be explicit and recoverable. Initial implementation may use PostgreSQL-backed jobs/outbox in `apps/worker`. A durable workflow engine such as Temporal can be introduced later behind the workflow port without rewriting domain invariants.

## API

Internal API is versioned and contract-first. External/provider webhooks terminate at integration adapters, are authenticated, normalized, idempotently recorded, then translated into domain commands/events.

## UI

The UI is entity- and workflow-centered rather than menu/form-centered. Core patterns include:

- global search/command palette
- timeline/activity stream
- 360-degree entity pages
- workflow status and exceptions
- side panels/drawers for fast inspection
- dense tables only where operationally necessary

Primary navigation begins with: Overview, Product, Supply, Commerce, Vehicle, Partners, Finance, Service and Communication.
