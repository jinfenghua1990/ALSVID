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
