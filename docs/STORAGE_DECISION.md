# Object Storage Decision

## Purpose

This document records why ALSVID uses object storage, why Cloudflare R2 is the current choice, how Development and Production are separated, and what must remain portable.

## Decision summary

- **Object-storage standard:** S3-compatible object storage behind ALSVID ports/adapters
- **Current provider:** Cloudflare R2
- **Development storage:** dedicated Development bucket/resources
- **Production storage:** separate Production bucket/resources
- **Database rule:** binary files do not belong inside PostgreSQL; PostgreSQL stores metadata, references and business relationships.

## What belongs in object storage

Examples include:

- vehicle and product photos;
- after-sales and repair photos;
- manuals and PDFs;
- warranty/service attachments;
- contracts or other binary business documents;
- videos or large media files;
- generated files that need controlled download access.

## Why not store files directly in PostgreSQL

PostgreSQL is the authoritative relational database for structured business facts. Large binary files would unnecessarily increase database size, backup complexity, transfer cost and operational coupling.

ALSVID should store a file/object record in PostgreSQL with fields such as business owner, object key, media type, size, checksum, visibility/access policy and lifecycle state, while the actual bytes live in R2.

## Why Cloudflare R2

R2 is currently preferred because:

- it provides S3-compatible object storage semantics;
- it is suitable for public/private media and presigned URL workflows;
- it keeps file storage separate from the relational database;
- it has a low-cost/free-entry model suitable for ALSVID's current stage;
- it is globally reachable and can later integrate with Cloudflare's broader delivery/security ecosystem;
- the S3-compatible approach preserves migration options.

## Development and CI storage

Unit tests and ordinary CI do not require persistent object storage. Use mocks for routine tests. When a workflow specifically needs to validate external R2 behavior, provision a clearly isolated test bucket and credentials for that purpose only; verify the live binding before use. Local S3-compatible storage may be used for offline development.

## Production isolation

Production object storage uses its approved R2 bucket and scoped credentials. Local development and CI must not receive Production write credentials. Do not assume a separate R2 Development/Test bucket currently exists, and do not treat historical names as live resources.

Test code may create, overwrite or delete objects only in explicitly isolated disposable storage.

## Access rule

Application code must not depend directly on Cloudflare-specific SDK behavior inside business domains. Object operations should go through ALSVID storage ports/adapters so a future move to another S3-compatible provider does not require redesigning business logic.

## Customer-facing files

Files exposed through My ALSVID, Vehicle 360 or after-sales pages should use controlled URLs/presigned access where appropriate. Customer-facing URLs must not expose internal credentials or permit arbitrary object enumeration.

## Backup / disaster recovery scope

A separate full object-storage disaster-recovery architecture is not being built at the current stage. Q4 is not currently part of Production DR. Backup/DR requirements will be revisited when business scale and data criticality justify the added complexity.

## Change rule

Do not change R2 merely because another provider offers a temporary price advantage. A provider change should solve a concrete reliability, cost, legal, regional or operational problem while preserving the S3-compatible storage contract.
