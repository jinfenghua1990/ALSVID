# Environment Strategy

## Current model

Owner decision 2026-10-31: ALSVID has one live business environment, **Production**, shared by any number of authorized computers. Every actual deployment and business session uses the same Production identity, business data and Cloudflare R2. No separate test business environment exists. Local or GitHub development is allowed; compare changes before syncing either direction and preserve existing functionality.

Automated CI may use ephemeral synthetic fixtures without Production data or credentials. Such checks are not a business deployment. Verify actual service and data bindings rather than relying on environment labels; protect Production secrets and do not initialize, overwrite or delete live data during setup or validation.

## Release flow

```text
GitHub pull request → CI → merge → exact-commit main CI → Production dispatch → Cloud Run
```

- Pull requests target `main`; production code is not edited directly.
- CI checks migrations, architecture boundaries, types, tests, application builds, Docker builds and startup smoke checks.
- After merge, the trusted auto-merge workflow explicitly opts the main CI run into Production dispatch; ordinary manual CI runs do not deploy. Direct pushes to `main` follow the same exact-commit CI gate.
- Production deploy accepts only the exact successful main commit and runs explicit migrations and live health checks. Obsolete releases are skipped when a newer `main` commit exists.
- Manual rollback selects a previously released main commit with explicit rollback confirmation. Application rollback does not reverse database migrations.
- No automatic synchronization to `develop` or cloud Development deployment is part of the current pipeline.

## Retired environment

The former `alsvid-dev` Cloud Run environment and its promotion workflows are retired. Historical audit documents may mention them as prior state. Do not recreate or delete cloud resources based solely on repository documentation; verify the live inventory and ownership first.
