# Pull request auto-merge

Changes to `main` must be submitted through a pull request. The required GitHub Actions checks are `verify` and `containers`; both must pass before merging. Required human approvals are set to zero, and the rules also apply to repository administrators.

The `PR Auto Merge` workflow automatically merges ready, non-draft pull requests targeting `main` from this repository after both CI jobs succeed. PR authors must be owners, members or collaborators. Fork PRs and drafts are excluded. The controller never checks out or executes PR code and uses the exact CI-tested head SHA when requesting a squash merge. All branch requirements remain enforced.

After a bot merge, the controller explicitly dispatches the same CI on `main`, because the workflow token does not trigger normal push workflows. Production accepts successful push or dispatched main CI for the exact release commit, still requires both jobs, and still rejects obsolete automatic releases. No long-lived token or additional secret is needed.

If CI fails, fix the change and let the checks run again. Do not bypass the required checks.
