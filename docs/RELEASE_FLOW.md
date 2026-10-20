# ALSVID Release Flow

## Temporary WWW-only launch policy (2026-10-20)

The public domain `www.alsvidbike.com` is ready for a staged brand-site rollout, while `admin.alsvidbike.com` currently fails a TLS preflight. Until the admin hostname is repaired, a failed Admin check must **not** block publication of the public WWW website.

- The main-branch CI dispatches `.github/workflows/www-deploy.yml`, rather than the full platform workflow, when changes do not include backend, database/shared packages or infrastructure. The standalone WWW workflow is guarded by successful exact-main-commit CI.
- WWW-only deployment builds and publishes **only** the `alsvid-web` image and updates the existing Web Cloud Run service. It reuses the running API URL and preserves its configured authentication base. It performs no API or Worker deploy, migration, backend secret change or mail-sender switch.
- This is a **Web-service-scoped** release, not a separate frontend hosting stack: the Web image also contains portal UI routes, so any existing portal hostname pointing to the shared Web service may see the same updated frontend bundle.
- The new `/release-check` JSON endpoint returns the non-sensitive active Web commit. The workflow requires the WWW hostname to return the expected commit after rollout; failure requests restoration of the preceding Web revision.
- Full-stack release `.github/workflows/production-deploy.yml` remains available as an explicitly triggered workflow once Admin DNS/TLS and backend authentication are accepted. Changes touching `apps/api`, `apps/worker`, `packages`, or the backend infrastructure are **not** automatically promoted via the WWW-only path.
- Sender domain migration to `alsvidbike.com` is independent and postponed; existing verified mail settings remain unchanged. Links to portals whose domains are not yet configured may still fail, and must be checked before those portals are announced as launched.

## Current release mode

ALSVID operates against one live cloud runtime: Production. Codespaces/cloud development and disposable GitHub CI are used to build and validate candidates. The owner retired workstation development on 2026-10-18; do not recreate local clones or localhost preview servers. The former cloud Development/Test environment and automatic promotion flow are retired.

```text
Feature branch / pull request to main
        ↓
CI checks and container acceptance
        ↓
review and merge
        ↓
CI for exact main commit
        ↓
WWW-only Web release and exact public-hostname commit verification
        ↓
Full-platform migration/deployment later after portal DNS/TLS acceptance
```

## Production gate

Every production workflow must verify successful `verify` and `containers` CI jobs for the exact source commit before accessing cloud credentials. During this staged launch, WWW-only releases do **not** migrate the database or redeploy API/Worker. The separate full-platform release workflow retains those steps. A failed or cancelled CI run must not deploy.

Automatic deployment is limited to the current main source. Manual deployment requires explicit confirmation and either successful exact-commit CI or valid historical release evidence. Rollback is selected by a previously released main SHA; it does not reverse database migrations.

## Environments

- **Development:** GitHub Codespaces / connected cloud AI workspaces; Docker Compose and disposable developer data remain isolated within the cloud workspace.
- **CI:** GitHub-hosted ephemeral databases and containers; no Production secrets.
- **Production:** Google Cloud Run in `alsvid-prod`, with Production database, object storage and secret bindings.
- **Retired:** `alsvid-dev` cloud runtime and Development promotion workflows.

Application code may be shared, but credentials and data must remain isolated. Never infer actual provider bindings from configuration labels alone.

## Retired workflow references

`.github/workflows/development-deploy.yml`, `.github/workflows/promote-development.yml` and `.github/workflows/test-build.yml` are not part of the current release chain. Historical documents can describe the former process, but must label it as historical. No cloud resource cleanup or restoration is implied by this document.
