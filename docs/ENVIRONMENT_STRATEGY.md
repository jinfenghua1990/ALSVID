# Environment Strategy

## Purpose

This document defines how ALSVID separates development/Test from Production at the current business stage, and why the current design intentionally avoids a second full cloud runtime environment.

## Current environment model

### Development / Test

- Compute: M1 Mac
- Runtime: Docker using production-oriented container definitions
- Database: managed cloud Test PostgreSQL resources on Neon
- Object storage: dedicated Cloudflare R2 Test bucket/resources
- Secrets/config: Test-only credentials, never Production credentials

### Production

- Compute/runtime: Google Cloud Run
- Database: Neon PostgreSQL Production resources
- Object storage: Cloudflare R2 Production resources
- Secrets/config: Production-only credentials managed outside source control

## Why the M1 is the Test compute environment

ALSVID is currently developed primarily by one owner/operator. Maintaining a second always-available cloud runtime would add configuration, billing, secrets and deployment overhead before the collaboration/scale benefits are needed.

Using the M1 for Test is appropriate because:

- it keeps the development loop simple;
- Test failures have a small blast radius;
- Docker can preserve most runtime parity with Production;
- the actual managed database/object-storage behavior can still be tested through cloud Test resources.

## Why Docker is mandatory for production-bound Test acceptance

A bare macOS process is not enough to approve a Production release. Production runs in Linux containers, so release acceptance must exercise the same production-oriented container definitions.

This reduces differences in:

- runtime dependencies;
- filesystem behavior;
- environment variables;
- process startup;
- ports/networking;
- packaging/build output.

The M1 may run native development commands for speed, but a version is not Production-ready until the Docker acceptance path succeeds.

## Why Test database/storage remain cloud-managed

The M1 provides compute, but Test data infrastructure stays in the cloud to reduce false confidence from local-only infrastructure.

### Neon Test advantages

- managed PostgreSQL behavior is close to Production;
- TLS/connection behavior is realistic;
- branches can be reset/recreated without operating a local database server;
- schema migrations are tested against the same class of service used in Production.

### R2 Test advantages

- object URLs and presigned URLs behave like Production;
- CORS/HTTPS/permissions can be tested realistically;
- external systems/devices can reach the storage endpoint when needed;
- Test does not depend on localhost-only MinIO behavior.

## Why Test and Production data/resources must be separate

Even though compute is simplified, data isolation is not optional.

Test work may intentionally:

- create/delete vehicles;
- run destructive migrations;
- upload/delete objects;
- simulate Shopify/WMS imports;
- test repair/service records;
- reset fixtures repeatedly.

Those actions must never touch Production business data or files.

## Release/promotion model

ALSVID does not "convert" Test into Production.

The flow is:

1. develop on M1;
2. run/accept the containerized version on M1;
3. use Neon Test and R2 Test during acceptance;
4. approve a specific Git commit/version;
5. deploy the same approved version to Cloud Run Production;
6. Production connects to Production Neon/R2/secrets only.

Test data/files are not promoted as Production data.

## When to add Cloud Run Test later

Add a shared cloud Test environment only when at least one of these appears:

1. multiple people/AI workflows need a shared always-on integration environment;
2. important defects cannot be reproduced on M1 and occur only in Cloud Run/IAM/networking;
3. realistic load, concurrency or cloud infrastructure testing is required;
4. external partners need a stable non-Production callback endpoint.

Until then, keeping only Production on Cloud Run is an intentional simplification, not an architectural weakness.

## Offline development

If fully offline development becomes important, local PostgreSQL and local S3-compatible storage may be used temporarily. They are fallback development tools, not the normal ALSVID Test authority.

## Environment safety rules

- Never place Production credentials in Test `.env` files.
- Never point Test to Production database/storage by convenience.
- Never commit secrets.
- Clearly label Test and Production resources.
- A Production deployment must identify the exact Git commit/version being released.