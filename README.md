# ALSVID

ALSVID is a clean-slate enterprise digital platform for the complete bicycle business lifecycle: product engineering, sourcing, production, vehicle birth, export logistics, European inventory and dealer operations, commerce, finance, customer ownership, service, warranty, communications, and marketing.

This repository is the new implementation authority for ALSVID. It is intentionally **not** a migration of ChaiBen-OS or the previous ALSVID codebase.

## Clean-slate rules

- No legacy runtime code is copied into this repository.
- No legacy database migration chain is inherited.
- No backward compatibility with ChaiBen-OS or the previous ALSVID API is required unless a future ADR explicitly approves it.
- Historical repositories may be consulted for business requirements only.
- 1688, JackYun/吉客云, domestic China sales/tax/accounting workflows, and CoffeeBear business logic do not belong here.
- Shopify remains an external commerce/OMS integration; ALSVID owns its own business facts and reconciliation state, not a replacement generic OMS.

## Product direction

ALSVID is organized by durable business domains rather than by screens:

- Identity & Access
- Partners
- Product
- Engineering
- Procurement
- Production
- Inventory
- Warehouse
- Logistics & Export
- Commerce
- Finance
- Vehicle
- Dealer
- Customer
- Service & Warranty
- Communications
- Marketing
- Assets
- Integrations
- Audit & Compliance

The system begins as a modular monolith with explicit domain boundaries and contracts. This keeps deployment simple now while preserving a future path to split selected workloads when scale or organizational needs justify it.

## Technical baseline

- TypeScript end-to-end
- Next.js + React for web applications
- NestJS for application/API services
- PostgreSQL as the authoritative relational database
- S3-compatible object storage (Cloudflare R2 compatible) for binary assets
- Background worker for asynchronous jobs, integrations, AI-assisted processing, and long-running workflows
- API/event contracts shared through versioned packages

## Repository layout

```text
apps/
  web/        # Internal Admin, Dealer Portal, My ALSVID web surfaces
  api/        # NestJS modular-monolith API
  worker/     # async jobs, integrations, workflow execution
packages/
  database/   # PostgreSQL connection and migration runner
  contracts/  # API/event schemas and shared identifiers
  config/     # shared configuration primitives
  ui/         # ALSVID design system
  testing/    # test helpers and fixtures
domains/
  identity/    # users, roles, permissions, sessions
  audit/       # append-only audit evidence
  partners/    # unified Partner master
  product/     # Platform, Model, Variant, SKU
  engineering/ # Part, BOM revisions and Build Specifications
  assets/      # object metadata and business links
infra/         # local and production infrastructure definitions
docs/          # architecture, ownership, workflows, security and ADRs
```

## Local bootstrap

Copy `.env.example` to `.env` and set a bootstrap administrator password of at least 12 characters, then run:

```bash
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm bootstrap:admin
pnpm dev
```

Open the web app on `http://localhost:3000`, sign in, then use `/partners` for Partner master data and `/product` for Product/Engineering release work. The API runs on port `4000` by default.

`pnpm db:migrate` is safe to run repeatedly; applied migration filenames are recorded in `platform.schema_migrations`.

See `AGENTS.md` and the documents under `docs/` before making implementation changes.
