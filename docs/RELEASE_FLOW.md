# ALSVID Release Flow

## Current release mode

ALSVID currently uses a rapid Development → Production promotion flow.

```text
develop push
   ↓
CI + Development container acceptance
   ↓
Cloud Run Development deployment (alsvid-dev)
   ↓
Development API / Web / email-auth smoke checks
   ↓
Automatic promotion of the exact tested source tree to main
   ↓
Production deployment
   ↓
Production API / Web health verification
```

## Core rule

Production must never receive an untested source tree.

The automated promotion workflow only promotes a Development release when:

1. `CI` passed for the commit;
2. `ALSVID Development Build` passed for the commit;
3. `ALSVID Development Deploy` completed successfully;
4. the Development API health check passed;
5. the Development Web smoke check passed;
6. the Development email registration / password setup / persistent-session smoke flow passed;
7. the tested commit belongs to `develop`;
8. the tested commit contains the latest `main` history;
9. the promoted `main` source tree is byte-for-byte the same Git tree that passed Development.

If any of these conditions fail, Production is not dispatched.

## Environments

Development and Production run the same application source code but use separate environment resources and secrets.

### Development

- Branch: `develop`
- Google Cloud project: `alsvid-dev`
- Cloud Run services: Development Web / API
- Development database credentials
- Development R2 bucket
- Development/test mail settings

### Production

- Branch: `main`
- Production Google Cloud project and Cloud Run services
- Production database credentials
- Production R2 bucket
- Production Resend secret and sender configuration

The code version is promoted; databases, object-storage buckets, secrets and environment-specific configuration are not copied between environments.

## Workflows

- `.github/workflows/ci.yml` — static checks, migrations, tests and application build
- `.github/workflows/test-build.yml` — container-level Development acceptance
- `.github/workflows/development-deploy.yml` — deploy and smoke-test Development
- `.github/workflows/promote-development.yml` — automatically promote the completed tested Development release
- `.github/workflows/production-deploy.yml` — deploy Production and verify health
- `scripts/release-gate.mjs` — enforce Development acceptance before Production

## Safety behavior

- Promotion is serialized; two releases are not promoted concurrently.
- A Development release that is behind `main` is rejected instead of silently overwriting Production history.
- Promotion uses a pull request into protected `main` rather than force-updating the branch.
- Production is explicitly dispatched only after the merge result has the same Git tree as the tested Development release.
- Production database migrations remain an explicit release step before API/Web rollout.
- Rollback remains possible by manually dispatching the Production workflow with a previously released `main` commit.

## Temporary operating policy

During the current rapid-iteration stage, successful Development releases are intended to move directly to Production without an extra manual approval step.

When ALSVID enters a more stable multi-user release stage, this can be tightened without changing the architecture by adding a required GitHub Environment approval or disabling automatic promotion and keeping manual promotion only.
