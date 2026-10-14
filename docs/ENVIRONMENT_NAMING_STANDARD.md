# ALSVID Environment Naming Standard

## Current environment model

ALSVID has one active cloud environment: **Production**. Development happens locally; automated checks run in disposable GitHub CI environments. The former shared cloud Development/Test runtime is retired from the current release architecture.

| Name | Meaning | Data/resources |
| --- | --- | --- |
| Local development | Developer workstation and Docker Compose | Local, disposable resources |
| CI | GitHub-hosted workflow runner | Temporary PostgreSQL/containers; no Production secrets |
| ALSVID Production | Active business runtime in `alsvid-prod` | Production Cloud Run, Neon, R2 and managed secrets |
| ALSVID Development | Historical name only; former `alsvid-dev` cloud runtime | Not an active release or acceptance stage |

## Naming rules

Use **local development**, **CI**, and **Production** when describing current systems. Do not label a local Docker stack as a cloud Development environment. Do not infer that a provider resource exists from an environment label or old configuration.

The retired Development runtime and automatic promotion flow must not be restored without a new reviewed owner decision. Production resources, data and credentials must remain isolated from local and CI systems.

Historical documents may use the former Development/Test naming. Treat them as dated records, not current deployment instructions.
