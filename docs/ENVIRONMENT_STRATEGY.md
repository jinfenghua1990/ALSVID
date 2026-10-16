# Environment Strategy

## Current model

ALSVID has one live cloud business environment: **Production**. Development is performed locally, and automated validation runs in disposable GitHub CI environments. The former shared cloud Development/Test runtime is retired and must not be treated as an active release gate.

| Purpose | Runtime | Data |
| --- | --- | --- |
| Development | Local workstation / Docker Compose | Local disposable data |
| Automated validation | GitHub-hosted CI runners | Ephemeral PostgreSQL and containers |
| Business operations | Google Cloud Run in `alsvid-prod` | Production Neon, R2 and managed secrets |

Local and CI environments must not use Production credentials. A local Compose project name does not prove cloud resource isolation.

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
