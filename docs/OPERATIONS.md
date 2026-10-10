# ALSVID Operating Rules

## Purpose

This document turns the architecture decisions into practical operating rules. It is intentionally simple: ALSVID should be maintainable by the business owner and understandable to future developers or AI agents.

## Source of truth

GitHub is the software source of truth.

- `main` is the authoritative Production code line after review/merge.
- Releases are identified by Git commit/version.
- Running containers must be reproducible from repository code.
- Do not make permanent fixes by editing a running container or cloud console only.

## Current service map

| Responsibility | Current primary | Approved alternative / note |
| --- | --- | --- |
| Source code / history | GitHub | No second code authority |
| Production runtime | Google Cloud Run | Railway fallback 1; Apply.Build fallback 2 |
| Relational database | Neon PostgreSQL | Supabase PostgreSQL migration alternative |
| Binary/object storage | Cloudflare R2 | Keep S3-compatible abstraction |
| Development/Test compute | M1 Mac + Docker | Add cloud Test later only when justified |
| Test database | Neon Test resources | Must be isolated from Production |
| Test object storage | R2 Test resources | Must be isolated from Production |
| Commerce/order authority | Shopify | ALSVID does not become OMS |
| Warehouse execution | WMS | ALSVID consumes necessary status/facts |
| Disaster recovery | Deferred | Q4 not currently part of Production DR |

## Release flow

1. Develop on M1.
2. Run automated tests and architecture checks.
3. Build/run the production-oriented Docker containers.
4. Test against isolated Neon Test and R2 Test resources.
5. Validate Shopify/WMS connector behavior required by the change.
6. Approve a specific commit/version.
7. Deploy that version to Google Cloud Run Production.
8. Run explicit migrations through the approved deployment path.
9. Verify Web/API/Worker health and key business flows.

## Customer-visible external data freshness

ALSVID does not require permanent real-time synchronization from Shopify/WMS at the current stage.

Default model:

- scheduled synchronization/reconciliation at least once per day;
- customer/staff pages read the latest successfully cached ALSVID facts;
- My ALSVID / after-sales provides **Refresh latest status**;
- manual refresh fetches only the facts required for that view;
- UI shows last successful update time and an estimated refresh time;
- manual refresh uses a short cooldown/rate limit;
- real-time webhooks may be added later only when a real business requirement justifies the added complexity.

## Data ownership rule

External systems remain authoritative for their own domains:

- Shopify: storefront commerce/order/payment/refund facts;
- WMS: warehouse execution, dispatch and warehouse-side fulfillment facts;
- ALSVID: vehicle/VIN lifecycle, customer/dealer service relationship, warranty/service history and ALSVID-owned operational facts.

ALSVID may cache/store the external facts needed for Vehicle 360, My ALSVID and after-sales, but must not clone complete Shopify/WMS databases.

## Secrets

- Never commit credentials, API tokens, database passwords, R2 keys or real customer data.
- Test and Production credentials must be different.
- Production secrets belong in the approved cloud secret-management path.
- Local/Test secrets live outside source control.
- `.env.example` may document variable names but never real secret values.

## Domain and provider portability

Business domains must not depend directly on Google Cloud, Neon, R2, Shopify or WMS SDKs when a port/adapter boundary is appropriate.

The reason is operational freedom:

- Cloud Run can move to Railway/Apply.Build;
- Neon can migrate to Supabase/another PostgreSQL provider;
- R2 can move to another S3-compatible provider;
- Shopify/WMS providers can evolve without rewriting Vehicle/Service core logic.

## Cost discipline

ALSVID currently prefers low fixed cost and low operational burden over premature scale.

- Keep Cloud Run configured for the smallest practical footprint at launch.
- Do not create a second full cloud Test runtime until there is a real need.
- Prefer managed services/free-entry tiers where they reduce maintenance without creating dangerous lock-in.
- Re-evaluate provider cost only when measured usage or business requirements justify it.

## Domain / custom URL

A custom domain is not required to launch the technical Production environment. Cloud Run's provided HTTPS URL can be used during early deployment/acceptance. A branded domain can be added later for customer/dealer-facing surfaces and vehicle QR destinations.

## Q4 / backup / DR

Q4 is not currently a required Production runtime or disaster-recovery component. Full backup redundancy, off-site copies, restore objectives and automated failover are postponed to a later phase.

This is a conscious scope decision, not a claim that backups are unnecessary forever. Revisit backup/DR before ALSVID carries business-critical volume that would make prolonged data loss or downtime unacceptable.

## Change control

Before changing a confirmed provider or boundary, document:

1. the concrete problem with the current choice;
2. the proposed alternative;
3. migration/rollback impact;
4. cost and operational impact;
5. whether the change violates `docs/AI_CONTEXT.md`, `docs/BUSINESS_BOUNDARY.md` or existing ADRs.

Do not reopen settled architecture merely because a new AI, library or cloud vendor suggests a different fashionable stack.