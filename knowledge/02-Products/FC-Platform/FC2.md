# FC2 — public model presentation

status: active
owner: ALSVID
last_reviewed: 2026-10-20

## Scope

The owner requested that the supplied X5 be introduced as the second model on the existing ALSVID website, including a new detail page and directly optimized images. The owner confirmed the public model name **ALSVID FC2** on 2026-10-20. X5 is retained only as supplier/reference provenance. This document approves only source-attributed reference content for the model presentation; it is not an engineering release, a released retail SKU, or proof that checkout is connected.

## Authoritative source and structured record

- Owner-provided [PILOT X5 product source](https://naicisports.com/de/produkt/pilot-x5-faltbares-e-bike-aus-kohlefaser-leichtes-pendlerrad/).
- The current source HTML was retrieved on the review date. Its DAPU, torque, weight, dimensions and drivetrain fields were checked.
- Canonical numeric website record: [fc2.ts](../../../apps/web/app/_lib/products/fc2.ts).
- Localized descriptions and component names: [FC2 catalogs](../../../apps/web/app/_lib/i18n/fc2).
- The source brand is a supplier/reference provenance and is not used as ALSVID consumer-page branding.

## Configuration boundary

Reference figures apply to the source's stated standard configuration. Purple sample photographs show chain drive and a rear derailleur; the source's standard specification lists Shimano Nexus 3-speed and a Michelin belt. They are different configurations. Public copy and the gallery explicitly disclose this discrepancy. Retouching must not change the sample into a belt-drive version.

Rear four-bar suspension is distinct from main-frame folding. No suspension travel, folded timing, range, charge duration or performance effect is inferred.

Final ALSVID retail build, colours, price, stock, delivery, compliance, warranty and approved first-party product publication are **待确认 / unconfirmed**. Supplier MOQ, tooling, payment and warranty terms are not ALSVID consumer sales terms.

## Images and release

The first-party public assets are under `apps/web/public/products/fc2/`. Studio images are retouched from actual reference photographs; the original photos are retained for comparison. All marketing text is HTML, shared across locales.

See [image provenance and launch verification](../../../docs/FC2_MODEL_LAUNCH.md). Publication completion requires CI, exact-commit Production release and live-route evidence.
