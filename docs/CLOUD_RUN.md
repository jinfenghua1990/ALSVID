# Cloud Run deployment

ALSVID-Next is deployed as three independently built workloads:

- web: Next.js user interface, exposed through Cloud Run on port 8080.
- api: NestJS API, exposed through Cloud Run on port 8080.
- worker: long-running PostgreSQL-backed job worker. Deploy it as a Cloud Run Worker Pool when available, or as a separately managed worker service that does not receive public traffic.

## Production dependencies

- Cloud SQL for PostgreSQL, or another managed PostgreSQL provider.
- Cloudflare R2 for object storage.
- Google Secret Manager for DATABASE_URL, bootstrap credentials, object-storage credentials, Shopify credentials, and mail credentials.
- Cloud Logging through standard container stdout/stderr.

Do not use infra/docker-compose.yml in production. It is a local development stack for PostgreSQL and MinIO.

## Build images

All commands use the repository root as the Docker build context:

    docker build -f infra/docker/api.Dockerfile -t REGION-docker.pkg.dev/PROJECT/alsvid/api:TAG .
    docker build -f infra/docker/web.Dockerfile -t REGION-docker.pkg.dev/PROJECT/alsvid/web:TAG .
    docker build -f infra/docker/worker.Dockerfile -t REGION-docker.pkg.dev/PROJECT/alsvid/worker:TAG .

The repository currently has no lockfile, so the Dockerfiles use pnpm install --no-frozen-lockfile. Before production rollout, commit a generated pnpm-lock.yaml and change these commands to pnpm install --frozen-lockfile.

## Cloud Run configuration

For web and api:

- Set the container port to 8080.
- Set NODE_ENV=production.
- Inject secrets through Secret Manager references.
- Set ALSVID_API_BASE_URL on web to the private or authenticated API URL.
- Set DATABASE_URL only on api, worker, and the migration job.
- Run pnpm db:migrate as a one-off release/migration job before shifting traffic.
- Keep the API and worker private unless a specific integration requires public ingress.

For worker:

- Set DATABASE_URL.
- Set WORKER_ID, WORKER_QUEUE, WORKER_POLL_MS, and WORKER_LEASE_MS as ordinary configuration.
- Do not expose it as a public web endpoint.
- Configure graceful termination and a single active consumer per intended queue.

## Release order

1. Build and scan the three images.
2. Run the migration job against the target managed database.
3. Deploy or update the worker.
4. Deploy the API and verify /api/health.
5. Deploy the web service and verify login plus one authenticated API request.
6. Confirm Cloud Logging, database backups, and R2 lifecycle/backup policy.
7. Shift production traffic only after the smoke checks pass.
