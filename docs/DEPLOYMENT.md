# Deployment Model

## Local development

The repository must run locally with one command sequence using containers for infrastructure and normal Node processes for apps.

Local infrastructure target:

- PostgreSQL
- S3-compatible object storage (MinIO locally; Cloudflare R2 compatible in production)

The application itself runs as:

- Web
- API
- Worker

## First real deployment

The first deployment should favor operational simplicity: one host or a small number of managed services is acceptable. Microservices/Kubernetes are not prerequisites.

Recommended separation:

- GitHub — source/CI/release authority
- PostgreSQL — persistent business database with backups
- R2 — binary asset storage
- app runtime — Web/API/Worker containers or processes
- reverse proxy/TLS — public ingress where required

## Portability

Configuration is environment-driven. Avoid provider-specific assumptions in domain code so the stack can move between a local workstation, Q4/home server, VPS or managed platform without redesigning the application.

## Release

Production releases must be reproducible from Git commit SHA. Database migrations run explicitly before/with compatible application rollout. Backup/restore and rollback procedures must exist before production business data is accepted.


## Runtime authority and environment separation

### GitHub is the only code source

Deployed environments run software that exists in Git. There is no live patch, no hand-edited file
inside a running container and no copy of the application that exists only on a machine.

### The cloud platform runs ALSVID

ALSVID does not depend on a personal computer to operate.

- A local machine — including the M1 workstation — is a development environment only.
- It may run Web, API, Worker, PostgreSQL and MinIO for development, but it is never the production
  environment and never hosts the production database or production business files.
- Losing a local machine must not lose business data or the ability to reproduce the system.

### Configuration and secrets

Production configuration and secrets come from Google Cloud Secret Manager and are read by the runtime.
They are not committed and not embedded in images. Local development uses local values only.

### Runtime placement

| Artifact | Authority |
| --- | --- |
| Software program | GitHub |
| Runtime environment | Google Cloud Run |
| Business database | Managed PostgreSQL |
| Business files | Cloudflare R2 |
| Passwords and configuration | Google Cloud Secret Manager |
| Logs | Google Cloud Logging |
| Backup | GitHub + database backup + R2 + Q4 |

See `docs/RUNTIME_ARCHITECTURE.md` and ADR 0003.
