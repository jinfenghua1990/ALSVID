# Bicycle collection optimisation — 2026-10-27

Reference: https://himiwaybike.de/collections/himiway-e-bikes
Implementation: existing /de/bikes, /en/bikes and /zh/bikes in apps/web.
This is an incremental improvement to the existing catalogue, not a separate shop.

## Comparison and delivery scope

| Area | Current ALSVID evidence / change | Remaining acceptance |
| --- | --- | --- |
| Model discovery | Four existing model shortcuts, search, status and platform filters, A–Z sorting | Browser regression on all three locales and widths |
| Entry hierarchy | Compact existing hero; retained shop-concept preview link moved below the product content | Desktop/mobile visual review |
| Product cards | Existing images, reference facts, explicit publication status, detail and quick-view links retained | Production image loading review |
| Comparison | Visitor selects up to three models; persistent thumbnail tray supports removal, clearing and keyboard-accessible jump; table includes photos and existing reference wheel/frame facts | Browser checks for limits, filtering, clear and viewport fit |
| Quick view | Existing dialog and non-binding interest selection retained; adds the same reference wheel/frame facts as model cards | Dialog, quantity, cart persistence and Escape/focus regression |
| Filter recovery | Reset is available for active search/status filters even when results are non-empty | Non-empty and empty-state regression |
| Selection help | Localized purchase/colour/reference-data FAQ and existing dealer/service-directory links | Disclosure, language and link regression |
| Price, promotion, stock | No approved live values; continue to state that price is pending | Requires authoritative commercial release, not invented values |
| Ratings and customer reviews | No verified review feed in this catalogue | Requires genuine review source and approved publication |
| Saleable colours / variants | Reference photograph and proposed colours remain clearly distinguished | Requires approved variant assets and SKU bindings |
| Checkout, financing and delivery promises | Existing non-binding cart and unavailable-payment gate retained | Requires existing Commerce/Finance/Inventory release and provider/legal acceptance |

## Integration boundary

Upstream Product publication read model remains the source of model IDs, titles,
images and suppressed codes. This change writes no Product, Commerce, Finance,
Inventory or identity records. The existing cart helper still saves only a local,
non-binding interest selection. No price, stock, warranty, review count, technical
performance or saleable SKU is inferred from the competitor or preview images.

No API contracts, database migrations, external providers, cloud environments or
deployment authorities are added. Existing verify, containers and browser-preview
gates remain required; all project builds/tests run in disposable GitHub Actions.

## Evidence

Implementation is submitted as a draft PR until exact-head CI and browser checks
finish. Merge, production release and live visual verification are separate steps.
