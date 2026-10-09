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
| Internal Customer Center API | DONE | REWRITE projection |
| Internal Service Center API | DONE | REWRITE projection |
| Legacy HTML/Web ALSVID pages | REJECT | Replace with new standalone UI |
| Legacy ALSVID data import / cutover | TOOL READY | Dry-run/apply/verification still require real DBs |
| ChaiBen-OS ALSVID source removal | BLOCKED | Release only after real data cutover verification |
| 1688 / JackYun / DOMESTIC workspace logic | REJECT | Must never enter ALSVID runtime |
| Generic DOMESTIC procurement/inventory/finance | REJECT AS MIGRATION | Rebuild later for ALSVID export scope only |

## Existing ALSVID runtime parity

All existing ALSVID-specific domain/API capabilities from the extraction baseline now have standalone replacements. A dry-run-first migration engine and cutover runbook provide the operational data path without copying Workspace/DOMESTIC state into ALSVID.

The only remaining destructive gate is environmental rather than missing application code: run the cutover against the real ChaiBen source and standalone target, verify the migrated business facts, then retire the old ChaiBen ALSVID runtime in a separate PR. Source deletion before that evidence would violate the migration safety contract.

## Definition of clean migration

A capability is DONE only when its standalone business authority exists without ChaiBen runtime imports, its known legacy defects are not carried forward, and regression coverage protects the migrated invariant.
