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
Merge to develop
    |
    v
CI + container acceptance
    |
    v
开发/测试：ALSVID Development
    |
    v
Owner acceptance + develop -> main release PR
    |
    v
正式/生产：ALSVID Production
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

Feature branches start from `develop` and their PRs target `develop`. `main` receives release promotions only; it is never edited directly.

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

Development deployment runs from `develop`, after CI and container acceptance pass for that exact commit. The candidate must include the current `main` history.

Production deployment runs from a commit SHA on `main`. Before cloud authentication, the release gate requires a successful Development deployment and CI/container checks for identical source content. A merge commit or squash commit may have a different SHA, but its Git tree must match the tested candidate. Changes introduced while resolving a release PR must be deployed and tested in Development again.

After successful Production deployment, the workflow merges `main` history back into `develop`. It never force-pushes or overwrites newer Development changes. A conflict or concurrent push is reported as a workflow failure and requires resolution before the next Development deployment. The GitHub token's synchronization push does not trigger another Actions run; the tested code is already deployed, and the next normal developer push triggers CI and Development deployment.

For explicit rollback, a previously successful main-push Production release may be selected even if it is no longer the current Development candidate. Code rollback does not reverse database migrations. GitHub branch protection should require review and checks; deployment gates do not prevent an administrator from rewriting the workflow itself.

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
