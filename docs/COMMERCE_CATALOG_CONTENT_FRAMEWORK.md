# Admin-driven independent product pages

Implementation scope: the owner asked to build the framework first and enter product parameters later in Admin. Keep the independent comparison menu and existing PostgreSQL/R2/Cloud Run. The runtime release is established separately by exact-commit deployment and live checks.

## Content path
1. Open Admin → 商城方案对比 → 独立商品管理.
2. Add a product and enter its existing three-language name/description and optional proposal price.
3. Add up to 20 ordered parameter rows. Common bicycle parameter names are available as presets; values remain empty until the owner enters them. Custom names are supported in zh/de/en. Values that are identical in all locales can be copied explicitly into empty DE/EN fields.
4. Choose up to 4 parameters for the product card; all rows appear in the detail specification section. Empty parameter sections are hidden. Removing/reordering a row affects the saved display content only.
5. Save a draft, optionally upload a cover using the existing R2 workflow, and open the authenticated preview.
6. Publish to expose the product on `/{locale}/shop-preview` and its stable detail path `/{locale}/shop-preview/products/{id}`. Admin shows the public detail link for published products. Editing and saving published content is visible on the next page load without a software rebuild. Withdrawal/archival removes it from the list and makes the direct public detail route return 404.

The public detail and Admin preview share the same product/specification components. UI copy uses the shared locale catalogs and the public header keeps the locale-prefixed route. Public comparison pages remain noindex and checkout remains disabled.

## Data ownership and safe updates
Migration 0041 adds only an ordered localized `specifications` JSONB array on the independent comparison table, defaulting existing products to an empty list. This is display proposal content, not certified Engineering, SKU, stock, Finance or formal sales truth.

The application validates row count (20), featured count (4), complete zh/de/en labels (60 characters) and values (160 characters), plus the existing permissions, version and audit checks. Older update clients that omit the new field preserve existing parameters; an explicit empty array clears them. Plain text is rendered through React, never raw HTML.

## Verification
Use isolated CI for bounds/locale validation, actual PostgreSQL order/preservation/clearing, real login → BFF → API → persisted parameters → private/public SSR, direct-detail publication gates, browser editing and desktop/mobile image/layout checks. Do not populate Production with CI products or claim a live R2 upload based on the HTTPS media fixture.

Production signed-in acceptance may be performed later using the owner's real product content. The framework does not require product values during code implementation and must not fabricate specifications, reviews, prices or availability.
