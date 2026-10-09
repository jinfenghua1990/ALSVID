# ALSVID Standalone Extraction Status

Status: extraction complete for existing ALSVID-specific capabilities; zero-data cutover selected.

This file records parity for existing ALSVID-specific capabilities from the former ChaiBen-OS implementation. It does not treat future export features as migration debt.

| Capability | Standalone status | Disposition |
|---|---|---|
| Repository/runtime/database boundary | DONE | REWRITE |
| Authentication / authorization | DONE | REWRITE |
| Product / SKU foundation | DONE | REWRITE |
| FC / FT / CT / GT engineering | DONE | REWRITE |
| Parts / BOM / released revisions | DONE | REWRITE |
| R2 asset storage service/API | DONE | REWRITE |
| Vehicle identity / lifecycle | DONE | REWRITE |
| Vehicle Center / Vehicle 360 API | DONE | REWRITE |
| Dealer Portal | DONE | MIGRATE + REVIEW |
| My ALSVID claim / Garage | DONE | MIGRATE + REVIEW |
| Warranty / Service domain service | DONE | REWRITE |
| Internal Customer Center API | DONE | REWRITE projection |
| Internal Service Center API | DONE | REWRITE projection |
| Legacy HTML/Web ALSVID pages | REJECT | Replace with new standalone UI |
| Legacy ALSVID business-data migration | NOT REQUIRED | Zero-data cutover: no legacy ALSVID business rows require preservation |
| Legacy data-cutover tooling | RETAINED | Historical/contingency tooling only; not a release blocker |
| ChaiBen-OS ALSVID source removal | IN RETIREMENT | Old runtime is not authoritative and receives no new ALSVID work |
| 1688 / JackYun / DOMESTIC workspace logic | REJECT | Must never enter ALSVID runtime |
| Generic DOMESTIC procurement/inventory/finance | REJECT AS MIGRATION | Rebuild later for ALSVID export scope only |

## Existing ALSVID runtime parity

All existing ALSVID-specific domain/API capabilities from the extraction baseline have standalone replacements. `jinfenghua1990/ALSVID` is the sole authority for future ALSVID development.

The legacy ChaiBen-OS ALSVID workspace contains no business data that needs preservation. The operational cutover is therefore to initialize the standalone PostgreSQL schema and bootstrap ALSVID reference data, not to invent or copy historical business rows.

`docs/DATA_CUTOVER.md` and the migration engine remain useful as historical/contingency material, but they are not blockers for the current zero-data path.

## Future development is not migration debt

The standalone extraction does not mean the entire future export operating platform is already finished. Future ALSVID-specific procurement, production, warehouse/inventory/logistics, commercial finance, deeper Shopify integration, production deployment and polished UI remain normal product development.

Those capabilities must be designed for ALSVID export operations and must not import DOMESTIC/1688/JackYun business assumptions.

## Definition of clean extraction

A capability is DONE only when its standalone business authority exists without ChaiBen runtime imports, its known legacy defects are not carried forward, and regression coverage protects the invariant.

For current authoritative state and infrastructure boundaries, read `docs/CURRENT_STATE.md`.
