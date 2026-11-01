# Development Workflow

## Development workspace

Updated 2026-10-31: make day-to-day changes in the existing local checkout and use its Web on port 3000 for preview. Do not create another worktree or project copy. GitHub is secondary for synchronized history, backup, review and CI; compare local and remote changes before syncing and preserve both sides. The existing GitHub CI/review/release gates remain required before Production deployment. See `COLLABORATION.md`.

## Canonical flow

```text
Requirement → existing local checkout → compare/sync to GitHub → CI/review/merge
                                                                    ↓
                                                          Production deploy
```

## 1. Requirement and branch

State the intended outcome and boundaries before implementation. Record architecture decisions in `docs/adr/` when needed. Make changes in the existing local checkout. Before syncing to GitHub, compare both sides; integrate through a task branch and pull request to `main`, without force-pushing shared branches.

Suggested names: `feat/<topic>`, `fix/<topic>`, `rebuild/<topic>`, `docs/<topic>`.

## 2. Change and review

Implement the smallest change that satisfies the requirement and add regression coverage for changed invariants. Keep provider SDKs behind existing ports, preserve domain boundaries, and never commit credentials or real customer data. AI-assisted changes still require human review.

A pull request should describe the change, what is deliberately out of scope, and how it was verified.

## 3. CI gates

CI validates migrations on PostgreSQL, architecture boundaries, TypeScript, tests, application builds, Docker builds, container startup and smoke checks. These gates must not be weakened merely to make a change pass. Documentation-only changes may skip expensive code checks while required gate jobs remain successful.

## 4. Merge and deploy

Merge only after review and required CI checks pass. A successful main-push CI run for the exact commit triggers Production deployment. The production workflow applies migrations explicitly, deploys the containers and checks live health. Production secrets are supplied by the approved cloud secret-management path.

Manual rollback selects a previously released `main` commit. It does not reverse database migrations; use a reviewed forward fix or separate recovery plan for schema/data recovery.

## Retired environment

Cloud Development/Test and its automatic promotion workflows are retired. Docker inside Codespaces and ephemeral CI are isolated validation environments, not cloud business environments. Do not restore cloud Development without a reviewed architecture decision.
