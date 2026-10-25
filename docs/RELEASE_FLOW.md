# ALSVID Release Flow

> **Current operating evidence: 2026-10-25.** This supersedes the 2026-10-20 temporary “WWW-only until Admin TLS works” launch note. The old Admin TLS failure is historical; a successful full deploy on 2026-10-25 verified the Admin login hostname.

## Current GitHub release pipeline

```text
Feature branch / PR → CI (verify + containers; browser preview where applicable)
                    → review / guarded auto-merge into main
                    → exact-main-SHA CI
                    → changed-path classification
                      ├─ WWW-only change → WWW Production Deploy
                      └─ API/Worker/domain/DB/lockfile/infra/workflow change → ALSVID Production Deploy
```

- **WWW-only**: [`.github/workflows/www-deploy.yml`](../.github/workflows/www-deploy.yml) builds and deploys only Web; API, database, mail configuration and Worker are preserved. It verifies `/release-check` matches the new Web commit, six `zh/de/en × bikes/accessories` catalog pages and Admin login modes. If post-deploy verification fails, its workflow attempts to restore the previously serving Web revision.
- **Full platform**: [`.github/workflows/production-deploy.yml`](../.github/workflows/production-deploy.yml) builds or reuses immutable Web/API images, executes explicit migrations, deploys API, checks health/Dealer routes/mail configuration, then deploys Web and checks the public site and Admin. [PR #361](https://github.com/jinfenghua1990/ALSVID/pull/361) added exact-release-SHA and multilingual catalog smoke parity to the full workflow. It does **not** prove database restore or authenticated Admin business operations.
- CI never uses Production data or secrets for its isolated PostgreSQL/container tests. A green CI or Cloud Run rollout does not, by itself, prove checkout, payment, inventory fulfillment or external-system acceptance.
- Changes to a GitHub workflow or shared dependency require the full release path. Main-branch release dispatch rejects obsolete source SHAs. A manual rollback is restricted to eligible previously released commits and does **not** reverse migrations.
- Cloud Run uses one production runtime; the retired `alsvid-dev` shared environment must not be recreated as a normal promotion stage.

## Observed production versus intended migration

The [successful full production release #40169393607](https://github.com/jinfenghua1990/ALSVID/actions/runs/40169393607) deployed SHA `a9f6a3746ff738a5300d96c465790f3a7f7656b3` in **GCP project `alsvid-production`**, region **`europe-west1`**. Logs verify Web/API deployment, API health, public Dealer endpoint and Admin login modes. This is the **observed runtime**, not a promise that every business process has passed end-to-end acceptance.

The separately created **`alsvid-prod`** is the intended new-project migration target, **not a verified active deployment**. The GitHub Production Environment's `GCP_PROJECT_ID` and related Workload Identity / secrets / registry variables control the actual target. Do not simply change those variables to `alsvid-prod`, point it at live Neon/R2 or switch DNS without checking new-project provisioning, secret isolation, database migration strategy, service identity, full smoke tests, rollback and domain cutover. Track this in [Issue #34](https://github.com/jinfenghua1990/ALSVID/issues/34).

## Release acceptance boundaries

1. The selected full 40-character source SHA exists on `main`, is current for an ordinary release, and has successful exact-SHA `verify` and `containers` jobs.
2. Confirm the correct workflow ran and its own post-deploy validations passed. Compare `/release-check` to the expected SHA; check public site and Admin login; for a full release also check API/Dealer and migration steps.
3. After publication, perform **authenticated business** acceptance separately: user permissions, Product approvals, orders/inventory/production transitions, audit trail, and error handling.
4. External acceptance is separately required for PSP, 3PL/WMS, R2 read/write/checksum, isolated Neon backup/restore drill, cost alerts and domain/auth cutover. None is completed solely by a green deployment badge.
5. If a full release fails after API/database changes, preserve evidence and apply a compatible reviewed forward fix or rollback plan. Do not restore an older database directly over live Production.

See [Production Runbook](PRODUCTION_RUNBOOK.md), [Environment Architecture](ENVIRONMENT_ARCHITECTURE.md), [Current State](CURRENT_STATE.md) and [Issue #34](https://github.com/jinfenghua1990/ALSVID/issues/34).

## Retired references

The previous 2026-10-20 `WWW-only because Admin TLS failed` note and older `alsvid-prod`-as-live claims are historical, not current runtime evidence. `development-deploy.yml`, `promote-development.yml` and `test-build.yml` are retired; no cloud resource cleanup is implied.
