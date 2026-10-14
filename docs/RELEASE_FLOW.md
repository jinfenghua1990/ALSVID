# ALSVID Release Flow

## Current release mode

ALSVID operates against one live cloud runtime: Production. Local development and disposable GitHub CI are used to build and validate candidates. The former cloud Development/Test environment and automatic promotion flow are retired.

```text
Feature branch / pull request to main
        ↓
CI checks and container acceptance
        ↓
review and merge
        ↓
CI for exact main commit
        ↓
Production migration, deployment and health verification
```

## Production gate

The production workflow must verify successful `verify` and `containers` CI jobs for the exact source commit before accessing cloud credentials. It runs explicit database migrations, deploys the Web/API/Worker images and verifies live health. A failed or cancelled CI run must not deploy.

Automatic deployment is limited to the current main source. Manual deployment requires explicit confirmation and either successful exact-commit CI or valid historical release evidence. Rollback is selected by a previously released main SHA; it does not reverse database migrations.

## Environments

- **Local:** workstation and Docker Compose; disposable developer data.
- **CI:** GitHub-hosted ephemeral databases and containers; no Production secrets.
- **Production:** Google Cloud Run in `alsvid-prod`, with Production database, object storage and secret bindings.
- **Retired:** `alsvid-dev` cloud runtime and Development promotion workflows.

Application code may be shared, but credentials and data must remain isolated. Never infer actual provider bindings from configuration labels alone.

## Retired workflow references

`.github/workflows/development-deploy.yml`, `.github/workflows/promote-development.yml` and `.github/workflows/test-build.yml` are not part of the current release chain. Historical documents can describe the former process, but must label it as historical. No cloud resource cleanup or restoration is implied by this document.
