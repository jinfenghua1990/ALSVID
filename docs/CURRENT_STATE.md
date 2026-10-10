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

## Planned capability sequence

1. Identity, access, audit and Partner master — **foundation implemented**
2. Product + engineering + asset foundation
3. Procurement + supplier PO + receipts
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
