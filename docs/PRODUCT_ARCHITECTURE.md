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


## Commercial product identity (Tmall-style model)

The customer-facing commercial product is represented by one stable Model record and its immutable database ID. A single product detail page can offer multiple Variant choices (for example Standard / Pro) and multiple SKU combinations (for example colour, market and size).

- The Model ID is the stable parent product ID. Changing the selected colour or another SKU dimension does not create a new Model and does not change the parent product ID.
- Each SKU is a unique, orderable stock identity with its own unique SKU code and database ID. Different colour/market/size combinations must not share a SKU code.
- Variant is a commercial configuration grouping under the Model; SKUs for all variants beneath the same Model retain the same parent Model ID.
- A storefront SKU selection resolves to the exact SKU record. Price and stock are read from their owning domains; do not copy them into Product as a second source of truth.
- Cart lines, order lines, inventory reservations, dealer order lines and engineering build specifications must reference the exact selected SKU, not only the parent Model.
- Product ID / Model ID and SKU code are stable identifiers. Rename or retire records without reusing their identifiers.
- Keep the internal UUID as the immutable system identity. Model code (for example FC1) is the human-facing model code, not a substitute for the database primary key.
