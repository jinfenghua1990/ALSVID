# Medusa/CRMEB comparison on existing PostgreSQL, 2026-10-26

Status: accepted; independent catalog slice implemented and deployed. Authenticated production write acceptance remains open.

The owner clarified that the goal is to bring the actual Medusa storefront and CRMEB Chinese Admin source into ALSVID's GitHub and publish under WWW and a separate Admin menu. The owner already has Neon PostgreSQL, R2 and Cloud Run, and explicitly requested rewriting the integration for the existing database instead of adding MySQL.

## Decision
Keep the imported upstream source and licenses. Adapt the selected Medusa storefront and CRMEB Admin surfaces to ALSVID's authenticated API. Rewrite the selected catalog behavior in the existing Node/TypeScript modular monolith and PostgreSQL. The native PHP/MySQL package remains source/reference acceptance only; it is not the target deployment or a prerequisite. No new database provider, virtual server, Cloud SQL or PHP production runtime is needed for this slice.

Commerce owns the independent comparison catalog through application ports and a PostgreSQL repository. Add only commerce_lab.catalog_products to the existing database. These rows are proposals for comparison, not Product master data, approved prices, inventory or live orders. Existing Product/Commerce/Finance/Inventory authorities remain intact. No business/test seeds are promoted into production.

The API requires system_admin and existing commerce.read / commerce.map permissions for internal reads/writes. Public reads return only PUBLISHED rows; data stays out of original portal storage and original business tables. Updates require expectedVersion, immutable code/identity, and atomic audit recording. Archive is reversible; no delete/reset endpoint.

The existing reviewed migration/deployment chain must validate the additive schema in isolated CI, preserve current data and then deploy the exact approved source. Do not issue ad hoc DDL through Neon tools. Original payment gates remain closed.

## Superseded deployment assumptions
A pre-existing CRMEB host or a new MySQL service is not required. The earlier native PHP/MySQL workflow proves upstream contracts only. The proposed Cloud SQL inventory is no longer on the delivery path; existing Neon production metadata was verified read-only.

## Implementation and evidence
The native-source-derived product surfaces and persistent catalog behavior shipped through PR #372. PostgreSQL integration tests and isolated browser checks passed. The exact production commit, migration and live read-only checks are recorded in [the delivery scope](../COMMERCE_SOURCE_DELIVERY_SCOPE_2026-10-26.md), the maintained release/acceptance record for this slice.

## Remaining acceptance and optional extensions
Authenticated production Admin create/edit/publish/withdraw and public refresh still need a recorded end-to-end acceptance. Isolated fixture writes do not establish that evidence. Custom R2 media mapping and any formal SKU/price/stock/checkout/payment/fulfillment work are separate extensions; the current comparison feature intentionally uses allowed reference images and does not transact. CRMEB's full module set has not been ported merely because its source is present.
