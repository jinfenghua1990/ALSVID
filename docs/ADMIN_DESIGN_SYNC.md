# Admin design synchronization — 2026-10-16

This change brings the reviewed Ardot file `736467599966143` into the existing Admin UI fixture layer. It is a coherent frontend change, not a Shopify/WMS replacement or a backend implementation.

## Delivered

- 85 module, detail and workflow-state screens across all ten Admin modules. The existing workbench stays in place.
- Protected independent routes, contextual page links and workflow-state navigation. Exact routes and Ardot node IDs are in `apps/web/app/_design/sync-manifest.json`.
- Native tables with local text filtering, editable example forms with reset, platform cards, metrics, and explicit example/unconnected states.
- The reviewed FC1 Pro / BOM V2.0 / ALS00001 / AL-2026-0184 chain, mixed stock classification, and separate original repair versus DEMO replacement records.
- Unknown GT1 classifications, ALS00002 dates and incomplete service records remain pending verification.

## Boundaries

Admin still requires its existing server-side administrator session. Fixture editing lasts only on the current page; it does not save business records or execute approvals, production, inventory movements, shipments, messages, provider connections or permission changes. Operations without a backing service are disabled. Some business-navigation labels do not yet have a dedicated implementation; all imported screens are reachable through the module's page list.

These screens are rendered with the existing shared Admin renderer and responsive styles. This is a semantic/native UI synchronization, not a pixel-for-pixel raster export. Several old MCP reads were incomplete; the five standard transfer screens were transcribed from the reviewed screenshots, and reviewed chronology corrections supersede stale cached leaves.

## Reimport

The committed fixture JSON is the source used by the application. To regenerate it from the reviewed handoff/export directory:

```sh
node scripts/sync-admin-design.cjs /path/to/ardot-audit
```

The generator reads design JSON/JSONL only and does not connect to a database or write to Ardot. Review its output before committing a later import.

## Validation

- Web TypeScript and production build.
- Architecture gate for 16 domains.
- Five Web tests, including route uniqueness/table integrity, the delivered-vehicle chain, repair/demo separation and the existing Admin/Dealer preview guard regression.
- Authenticated Chrome navigation to all 85 routes: every expected title rendered.
- Browser text filtering, example-form editing/reset and workflow navigation.
- Desktop visual inspection of the replacement screen; a global dark-theme form override was scoped to preserve the imported light design.

This change is local/GitHub source delivery. It does not establish a Production deployment or live integrations.
