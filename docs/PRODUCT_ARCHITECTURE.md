# Product and Vehicle Architecture

## Product hierarchy

ALSVID uses the following durable hierarchy:

1. **Platform** — long-lived engineering/commercial family, e.g. FC / FT / CT / GT
2. **Model** — named model generation within a platform, e.g. FC1
3. **Variant** — customer-facing configuration family such as Pro / Touring / EU configuration
4. **SKU** — sellable/orderable stock identity, including market/color/size/configuration dimensions as required
5. **BOM Revision** — engineering bill-of-materials revision
6. **Build Specification** — released specification that combines the exact engineering configuration used for production
7. **Vehicle** — one physical bicycle

## Rules

- Product and engineering data describe what *may be built*.
- Build Specification describes what production *is authorized to build*.
- Vehicle describes what *was actually built*.
- A Vehicle references the released Build Specification used at birth.
- A Vehicle may carry serialized-component facts when required for warranty/service traceability.
- SKU can change commercial presentation without rewriting historical Vehicle identity.

## Vehicle identity

Vehicle is born once production passes the release gate. At minimum it receives:

- internal immutable vehicle ID
- unique frame number
- build specification reference
- production/QC evidence references
- birth timestamp/site
- lifecycle status

Once released, the frame number cannot be edited. Corrections require controlled administrative evidence rather than silent overwrite.

## 360 views

Product 360 should expose engineering, assets, inventory, commerce and service implications without owning those facts.

Vehicle 360 should expose birth/build, logistics, inventory/dealer path, ownership, warranty/service, assets/documents, finance references where authorized, and a full timeline.
