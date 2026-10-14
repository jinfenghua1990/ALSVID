# Pull request auto-merge

Changes to `main` must be submitted through a pull request. The required GitHub Actions checks are `verify` and `containers`; both must pass before merging. Required human approvals are set to zero, and the rules also apply to repository administrators.

Enable auto-merge on each ready pull request. Enabling the repository's auto-merge setting alone does not enable auto-merge for every pull request.

If CI fails, fix the change and let the checks run again. Do not bypass the required checks.
