# Isolated native CRMEB acceptance, 2026-10-26

Status: approved scope for disposable validation only, under the owner's request to build an independent Medusa frontend / CRMEB backend comparison. This does not approve a production engine replacement or a new permanent service.

## Decision
Run fixed upstream CRMEB source (da8d3b93400f3c660aa54d38b54ada387c963cd9), its bundled dependencies, PHP 7.4, isolated MySQL and Redis only on disposable GitHub Actions runners. Do not use the upstream Docker cleanup script, install/reset a persistent database, or expose a shared test environment.

The bootstrap accepts no target DSN and rejects nonempty databases. It connects only to a fixed loopback port/database/user created by the workflow; imported sample credentials are invalidated. The native HTTP listener is loopback-only; no worker, timer or payment processor is started. Workflow permissions are contents:read, checkout credentials are not persisted, and no production secrets are referenced. Uploaded evidence contains fixture IDs/names and result flags only, not the imported SQL, full responses, .env or upstream customer samples.

The deployed readonly adapter is tested against the actual native API through a CI-injected loopback transport. This validates parsing and rename propagation, not production networking, authentication, UI integration or completed Medusa engine integration. No production validation bypass is added.

## Data authority
CRMEB owns disposable sample rows only. ALSVID Product/Commerce/Finance/Inventory and their PostgreSQL data remain authoritative and untouched. A native persistent comparison environment must have distinct data, sessions, secrets and storage, with documented hosting, backup and exit behavior before creation. No dual writing of business orders.

## Completion remaining
Persistent native CRMEB hosting and HTTPS, real Admin access, adapting the native Medusa storefront data layer, account/cart/order contracts and an end-to-end operator comparison are still required for complete integration. Payments remain closed under ADR 0005/0006.

## Evidence
The dedicated CRMEB native acceptance workflow must pass; tests using synthesized responses alone are insufficient. Record the exact application commit, upstream commit and uploaded report in the PR. A successful run is not a public deployment claim.
