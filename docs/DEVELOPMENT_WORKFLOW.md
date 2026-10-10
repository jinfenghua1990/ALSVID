# Development Workflow

## Canonical flow

```text
Requirement
    |
    v
GitHub Issue
    |
    v
Branch
    |
    v
AI / author change
    |
    v
Pull Request
    |
    v
CI
    |
    v
Merge to main
    |
    v
Deploy
```

Every meaningful change follows this path. There is no shortcut around it.

## 1. Requirement

A requirement is stated before implementation. If the requirement is only an idea, it is written down
first so that the change can be reviewed against something.

## 2. GitHub Issue

Every meaningful change maps to an issue.

- The issue states the problem, the intended outcome and the boundary of the change.
- Architecture-affecting decisions are recorded as an ADR under `docs/adr/` and linked from the issue.
- A change that cannot be described in an issue is not ready to be implemented.

Feature work must not be invented outside the roadmap in `docs/CURRENT_STATE.md`.

## 3. Branch

Work happens on a branch. `main` is never edited directly.

Suggested naming:

- `feat/<topic>` — new capability
- `fix/<topic>` — defect
- `rebuild/<topic>` — structural or encapsulation work
- `docs/<topic>` — documentation only

## 4. Change

The change is implemented on the branch, with tests for changed invariants.

- Generated or AI-assisted changes are reviewed by a human before merge. AI assistance does not
  change the review requirement.
- Provider SDKs stay behind ports; domain boundaries follow `docs/DOMAIN_STRUCTURE.md`.
- Secrets never enter the repository, in any form, on any branch.

## 5. Pull Request

A pull request is the review unit. It should:

- reference the issue it resolves
- state what changed and what was deliberately not changed
- state how the change was verified

## 6. CI

CI is a gate, not a formality. The current required gates are:

1. PostgreSQL migrations rebuild from an empty PostgreSQL 18 database
2. migrations are safe to run again with nothing pending
3. `pnpm arch:check` passes with no legacy domain warnings
4. all workspace TypeScript checks pass
5. all PostgreSQL integration tests pass
6. all Web / API / Worker / package builds succeed

CI rules are not weakened to make a change pass. If a gate is wrong, it is changed deliberately and
reviewed, not bypassed.

## 7. Merge to main

A change merges only when CI is green and the change has been reviewed. `main` is always a state that
could be released.

## 8. Deploy

Deployment runs from a commit SHA on `main`.

- Migrations run explicitly as a release step.
- Configuration and secrets come from Secret Manager.
- Release, backup/restore and rollback procedures follow `docs/DEPLOYMENT.md`.

## Documentation changes

Documentation follows the same path as code: issue, branch, pull request, CI, merge. A rule that is not
in the repository is not a rule.

## Things this workflow exists to prevent

- secrets committed to GitHub
- a production database hosted on a personal computer
- business files stored inside the code repository
- new business work bypassing an issue
- direct edits to `main`
- temporary architecture introduced just to ship a feature
