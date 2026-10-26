# Independent comparison product media

Status: implementation prepared in draft PR #375; isolated acceptance and Production rollout remain separate.

The owner already has Cloudflare R2, Neon PostgreSQL and Cloud Run and requested continued catalog optimization. Reuse these providers. Do not create a second storage service or write binary data into PostgreSQL.

## Ownership and publication
Assets owns object metadata and links. Migration 0040 adds only a nullable cover reference to the independent proposal catalog and permits its entity type in Assets links. Original Product/SKU/Finance/Inventory records remain unchanged.

Uploads require the existing internal Admin catalog permissions and asset.write. The application creates a unique product-scoped object key, validates bounded JPEG/PNG/WebP bytes and verifies returned size/type/checksum before linking the object. The caller cannot choose an arbitrary storage key, bucket or asset ID through the catalog API.

An upload changes the cover and optimistic version, but preserves the product publication state. Removing a cover detaches it and retains uploaded objects. Object-store and database changes are not one distributed transaction: a failed metadata/cover operation can leave an unreferenced upload, which is never served by the product media endpoint. A future retention/cleanup workflow must use verified ownership before deleting objects.

Private media reads require Admin catalog and asset.read permissions. Public media reads require a PUBLISHED proposal, its exact linked PUBLIC PRODUCT_MEDIA cover, and the configured provider/bucket/product key scope. They issue short-lived signed HTTPS read URLs; private object metadata and storage credentials are not returned in product DTOs. Withdrawal closes new public image URL requests; previously issued read URLs expire within 60 seconds.

## Runtime and acceptance
Image bytes pass through the existing authenticated Web/API routes, avoiding a browser-to-bucket CORS dependency. Dedicated buffer parsing and proxy limits cap image requests at 5 MiB; ordinary product metadata retains its existing smaller limit.

Ordinary CI uses real isolated PostgreSQL with a substitute ObjectStoragePort for media invariants, plus the existing R2 adapter tests. HTTP acceptance checks real authentication, binary transport limits and unavailable-storage behavior without Production credentials. Browser media redirects are fixtures and cannot prove a live R2 upload.

Production signed-in upload, private preview, publish/read and withdrawal still require acceptance on the owner's existing R2 binding after the release is approved. No Production upload was performed while preparing this change. The earlier automatic merge rejection still applies; keep the PR draft until the owner explicitly approves the reviewed release.
