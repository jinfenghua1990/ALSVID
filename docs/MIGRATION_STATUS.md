# ALSVID Standalone Extraction Status

This status file records parity for existing ALSVID-specific capabilities from the ChaiBen-OS extraction baseline. It does not treat future export features as migration debt.

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
| Internal Customer Center API | NEXT | REWRITE projection |
| Internal Service Center API | NEXT | REWRITE projection |
| Legacy HTML/Web ALSVID pages | REJECT | Replace with new standalone UI |
| Legacy ALSVID data import / cutover | NEXT | Preserve stable IDs; reversible verification |
| ChaiBen-OS ALSVID source removal | BLOCKED | Only after parity + data cutover verification |
| 1688 / JackYun / DOMESTIC workspace logic | REJECT | Must never enter ALSVID runtime |
| Generic DOMESTIC procurement/inventory/finance | REJECT AS MIGRATION | Rebuild later for ALSVID export scope only |

## Definition of clean migration

A capability is DONE only when its standalone business authority exists without ChaiBen runtime imports, its known legacy defects are not carried forward, and regression coverage protects the migrated invariant.
