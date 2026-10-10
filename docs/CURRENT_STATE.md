# Current State

## Status

ALSVID-Next is a clean-slate implementation created on 2026-10-10. No production or local business deployment exists yet and no real ALSVID business data needs backward compatibility.

The repository is therefore free to optimize architecture, schemas, APIs and user experience before the first real deployment.

## Authority

This repository is the implementation authority for the new ALSVID codebase. The previous ALSVID and ChaiBen-OS repositories are historical requirement sources only and must not be treated as code dependencies.

## Phase 0 — platform foundation

Implemented:

- repository governance and architecture contract
- domain ownership model and business-flow specification
- TypeScript monorepo
- Next.js web application shell
- NestJS API shell
- background worker shell
- PostgreSQL 18 and S3/R2-compatible local infrastructure
- CI with PostgreSQL migration verification, typecheck, tests and build

## Phase 1A — Identity, Audit and Partner master

Implemented:

- clean migration lineage beginning at `0001_identity_audit_partners.sql`
- Identity schema with users, role templates, permissions and revocable 12-hour sessions
- scrypt password hashing and explicit bootstrap-administrator command
- permission-based authorization for user, audit and Partner operations
- append-only Audit schema with database-level UPDATE/DELETE rejection
- unified Partner master for organization/person identities
- Partner roles: Supplier, Factory, Dealer, Customer, Service Partner and Logistics Provider
- globally unique normalized Partner identifiers such as VAT/EORI/registration references
- Partner contacts and addresses with explicit purpose
- optimistic Partner version control for concurrent edits
- authenticated NestJS APIs for login/logout/current user/users/roles/audit/partners
- Next.js Internal Admin sign-in flow using an HttpOnly session cookie proxy
- Partner list, search, detail, create and edit UI with role, identifier, contact and address visibility
- invariant tests for permissions, password verification, identifier normalization and duplicate roles

Not yet implemented in Identity/Partner scope:

- invitations, password reset and MFA
- SSO/OIDC
- fine-grained row/company scoping for a future multi-company requirement
- full UI editors for multiple Partner contacts/addresses/identifiers after initial creation

## Phase 1B — Product, Engineering and Asset foundation

Implemented:

- migration `0002_product_engineering_assets.sql`
- seeded FC / FT / CT / GT technology platforms
- Product hierarchy: Platform -> Model -> Variant -> SKU
- SKU market/color/size configuration facts kept separate from physical Vehicle identity
- optimistic versioning and lifecycle status for commercial Product entities
- Part master with category/unit/attributes
- BOM master, draft/released BOM revisions and BOM lines
- Build Specification linking an exact SKU to an exact BOM revision
- explicit engineering release permissions and audit evidence
- PostgreSQL guards that prevent silent mutation of released BOM revisions and released Build Specifications
- PostgreSQL guard preventing Build Specification release against an unreleased BOM revision
- Asset metadata for provider/bucket/object key/checksum/media metadata/visibility/classification
- generic Asset links to approved Product/Engineering entity types
- authenticated Product, Engineering and Asset APIs
- Internal Admin Product workspace for Model/Variant/SKU creation/editing and Part/BOM/Build Specification release workflow
- PostgreSQL integration tests for engineering release immutability

Not yet implemented in Product/Engineering/Asset scope:

- R2/S3 upload/download transport and signed URL adapter
- richer Product 360 media/document views
- engineering change orders / supersession workflow
- substitute-part approval workflow
- production consumption and as-built deviation evidence; these belong to Production

## Planned capability sequence

1. Identity, access, audit and Partner master — **foundation implemented**
2. Product + engineering + asset foundation — **foundation implemented**
3. Procurement + supplier quotation/PO/confirmation/receipts
4. Production + QC + vehicle birth
5. Inventory + warehouse operations
6. Export logistics: China -> Germany warehouse and China -> dealer direct
7. Dealer + commerce + Shopify fact synchronization
8. Finance: AR/AP, invoice, payment, allocation, settlement, FX and landed cost
9. Vehicle 360 + ownership + customer garage
10. Service/warranty + parts + repair history
11. Communication Center + email marketing/consent/suppression
12. production deployment, observability, backup/restore and automated release workflow

A capability is considered implemented only when code, persistence, authorization, tests and the required user-visible workflow are present.
