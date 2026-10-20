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
| Development / CI compute | Local Docker + ephemeral GitHub runners | No active cloud Development runtime |
| Test database | Local Docker PostgreSQL / ephemeral CI PostgreSQL | No Production credentials |
| Test object storage | Local or explicitly isolated test bucket when required | Never assume a live Test bucket exists |
| Commerce/order authority | ALSVID Commerce | Owns its first-party B2C storefront order lifecycle; not a general-purpose OMS |
| Warehouse execution | WMS | ALSVID consumes necessary status/facts |
| Disaster recovery | Deferred | Q4 not currently part of Production DR |

## Release flow

1. Submit a reviewed pull request into `main`.
2. `CI` runs architecture checks, type checks, tests and builds, alongside cached Docker builds and startup/migration/authentication smoke checks on disposable GitHub runners.
3. After merge, the same checks run against the exact `main` commit. The trusted auto-merge workflow opts this run into production deployment; ordinary manual CI runs do not deploy.
4. Once both `verify` and `containers` jobs succeed, the main CI workflow dispatches `ALSVID Production Deploy` for that exact commit. Direct pushes to `main` use the same gate; failed or cancelled CI does not deploy.
5. Production verifies both jobs for the requested commit, builds with the same cache scopes, then runs the existing explicit migrations, deployment and live health checks.
6. Automatic releases skip an obsolete commit if a newer `main` exists. Manual release still requires `confirm=deploy`; deploying an older commit also requires the explicit rollback option and successful Production release evidence.

The separate cloud Development runtime and its promotion workflow have been retired by owner decision. CI databases and containers are temporary validation tools, not another cloud business environment. They use no Production secrets.

`Run workflow` remains available for a specific merged release or rollback. The current trusted workflow's release gate is used even when checking out an older source commit, so rollback does not restore retired gate dependencies.

Application rollback is performed by entering the previous known-good `main` commit SHA as `release_sha` in `ALSVID Production Deploy`. The workflow must reuse the already published image digests for that release; it must not rebuild an older source with mutable base-image tags. It does not restore or downgrade the live database; schema rollback requires a separate reviewed recovery or forward-fix plan.

## Customer-visible external data freshness

ALSVID does not require permanent real-time synchronization from optional external sales channels/WMS at the current stage.

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

- ALSVID Commerce: first-party storefront order/cart/checkout state;
- Finance + PSP: payment attempts, verified payment state, refunds and settlement; PSP executes the external transaction;
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

Business domains must not depend directly on Google Cloud, Neon, R2, payment-provider or WMS SDKs when a port/adapter boundary is appropriate.

The reason is operational freedom:

- Cloud Run can move to Railway/Apply.Build;
- Neon can migrate to Supabase/another PostgreSQL provider;
- R2 can move to another S3-compatible provider;
- Payment-provider, optional sales-channel and WMS adapters can evolve without rewriting Commerce/Finance/Vehicle/Service core logic.

## Cost discipline

ALSVID currently prefers low fixed cost and low operational burden over premature scale.

- Keep Cloud Run configured for the smallest practical footprint at launch.
- Do not create a second full cloud Test runtime until there is a real need.
- Prefer managed services/free-entry tiers where they reduce maintenance without creating dangerous lock-in.
- Re-evaluate provider cost only when measured usage or business requirements justify it.

## Domain / custom URL

Admin's canonical target entry is `https://admin.alsvidbike.com`; the old `chaibenn.com` domain is legacy and must not be generated for new cross-portal links. Production authentication/email links use the configured canonical domain, not request-host inference or technical service aliases. Before release, verify DNS/TLS, Cloud Run custom-domain binding, `AUTH_BASE_URL`, verified mail sender domain, identity callbacks and browser flows as listed in `docs/PORTAL_DOMAINS.md`. This target mapping is not proof that the production domain migration has completed.

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
