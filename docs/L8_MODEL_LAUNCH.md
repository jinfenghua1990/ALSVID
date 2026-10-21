# L8 product introduction

## Scope

Owner request: introduce the supplied carbon folding e-bike as ALSVID L8, add a homepage entry, and publish through GitHub to the existing Cloud Run website. Build the remaining site incrementally.

- Routes: `/zh/explore/l8`, `/de/explore/l8`, `/en/explore/l8`.
- Homepage: L8 feature immediately after the hero, plus a footer model link.
- Design reference: the existing ALSVID WWW visual system and FC2 page structure; shared `PublicSiteHeader`, shared language switcher and primary button treatment. L8 uses a restrained violet product-photo stage.
- Product truth: [L8 knowledge record](../knowledge/02-Products/L8.md). Supplier reference configuration is visibly qualified; no price, inventory, range, measured weight, delivery or production-compliance claim is inferred.
- No L8 purchase/reservation action, and no unconfirmed assignment to an FC platform. Existing models and catalog filters retain their behavior.

## Reference images

The owner-supplied manufacturer source provides these unmodified photos, imported to repository assets and served by ALSVID rather than hotlinked:

- `apps/web/public/products/l8/reference-side.png`: https://naicisports.com/wp-content/uploads/2026/04/PILOT-X8-Carbon-Fiber-Smart-Folding-Ebike-Main-View-1024x1024.png
- `apps/web/public/products/l8/reference-folded.png`: https://naicisports.com/wp-content/uploads/2026/04/PILOT-X8-Premium-Urban-Ebike-Folded-Size-Display-scaled.png

The gallery visibly identifies reference photography and allows side/folded switching. Translated HTML holds the copy; the two photos have no baked-in promotional text.

## Verification and release

Use GitHub PR CI, not a workstation checkout. Required checks remain `verify` and `containers`.

The existing FC1 browser preview workflow also runs `scripts/l8-browser-smoke.mjs`. Its report and screenshots are included in the `fc1-and-official-browser-review` artifact. Coverage: zh/de/en at 1440, 390 and 320px; homepage entry to detail page; image loading; gallery via click/keyboard; section anchors; reference specifications; shared navigation; canonical/alternates; language-route preservation; no overflow or runtime errors. L8 locale resources are checked for key/interpolation parity by the web test suite.

After a successful exact-head PR validation, merge through the existing PR path. Main CI dispatches the existing WWW-only production workflow for this web-only change. Verify `/release-check` against the deployed main SHA, all three L8 URLs, their homepage links and both image URLs. A queued deployment is not completion.
