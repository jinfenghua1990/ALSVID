# L7, cup-holder reference and model navigation

## Requested behavior

The owner clarified that L8 must appear in the top navigation, then supplied the X7 source for ALSVID L7 and a Tmall cup holder as an accessory.

- Shared WWW navigation: FC1 → FC2 → L7 → L8 → Products → Dealers → Owner services → Brand story. Mobile shortcuts show all four model names, with current-page state.
- L7: `/{locale}/explore/l7`, homepage feature and footer link; existing homepage hero and L8 feature retain their positions.
- Cup holder: `/{locale}/explore/accessory-cup-holder`, homepage accessory card and product-center accessory feature. Black/cream reference image switching; no ordering action.
- All new copy and metadata use the existing zh/de/en catalogs and shared header.
- Product truth: [L7](../knowledge/02-Products/L7.md), [cup holder](../knowledge/02-Products/Quick-Release-Cup-Holder.md). Prices, stock, final builds and fit are not inferred.

## Design and source assets

Reuse the verified ALSVID WWW/FC2/L8 design language. L7 uses the same layout with white photo surfaces for the source's original white-background photographs, featuring the low step-through frame and carrying opening rather than L8 suspension copy.

Original references are imported into `apps/web/public/products/l7/` and `apps/web/public/products/accessories/`. Supplier/merchant marks are retained. The cup-holder source image labels are translated in adjacent HTML captions/alt text; the source artwork is not presented as ALSVID artwork or an approved pack list.

## Acceptance and release

Run existing PR `verify`, `containers`, portal browser checks and the FC1 browser preview. The latter also runs `new-products-browser-smoke.mjs`: zh/de/en × 1440/390/320px; visible top L7/L8 links, four mobile model labels fitting, L7 route/gallery/specifications/language switching, accessory catalog-to-detail navigation, cup image keyboard switching, and no horizontal overflow or browser errors.

Inspect generated header/L7/cup screenshots before merging. Use the existing main-CI → WWW Cloud Run workflow. Verify public release SHA, shared header links, both new detail routes and reference image URLs after deployment. This does not close the broader #263 catalog publication pipeline.
