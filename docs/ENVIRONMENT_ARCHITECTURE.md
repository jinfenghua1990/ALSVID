# ALSVID Environment Architecture

> Status: Confirmed  
> Purpose: Prevent confusion between local developer tooling, ALSVID Development, and ALSVID Production.

## 1. Canonical environment model

ALSVID has exactly two cloud business environments:

1. **ALSVID Development** — Google Cloud project `alsvid-dev`
2. **ALSVID Production** — Google Cloud project `alsvid-prod`

ALSVID Development = Development / Test 合并环境

The canonical communication names are **开发/测试：ALSVID Development** and **正式/生产：ALSVID Production**. Test is part of Development, never a third environment.

A developer machine such as the M1 Mac is local developer tooling. It may run the same code for fast iteration, but it is not a third cloud business environment.

```text
Local developer tooling
        ↓ optional
ALSVID Development (alsvid-dev)
        ↓ approved software version
ALSVID Production (alsvid-prod)
```

Do not add a third shared cloud environment unless a reviewed architecture decision explicitly changes this model.

## 2. Local developer tooling

The local machine may use Docker Compose, localhost services, temporary databases, local gateways and development watchers.

Local resources are disposable developer support infrastructure. They do not define the state of ALSVID Development or ALSVID Production, and local `.env`, Compose ports or container names must never be used as evidence of live cloud bindings.

## 3. ALSVID Development

ALSVID Development is the shared non-production cloud environment used to inspect and accept candidate changes before they enter Production.

Its authority is the dedicated Google Cloud project:

```text
alsvid-dev
```

Development must use resources isolated from Production, including:

- Development Cloud Run Web/API deployment;
- Development database / Neon resource;
- Development object-storage bucket / R2 credentials;
- Development-only Google Secret Manager secrets;
- Development-only Workload Identity and deploy/runtime service accounts;
- Development Artifact Registry images.

Development data is non-authoritative and must never be written to Production resources.

## 4. ALSVID Production

ALSVID Production is the live business environment. Its Google Cloud project is:

```text
alsvid-prod
```

Production must use its own Cloud Run deployments, Neon database, R2 bucket/credentials, Secret Manager secrets, Workload Identity and service accounts.

The same variable names may be used in Development and Production, but the values and resource targets must be different.

Example:

```text
Development:
GCP_PROJECT_ID -> alsvid-dev
DATABASE_URL   -> Neon Development
R2_BUCKET      -> R2 Development
secrets        -> Development Secret Manager

Production:
GCP_PROJECT_ID -> alsvid-prod
DATABASE_URL   -> Neon Production
R2_BUCKET      -> R2 Production
secrets        -> Production Secret Manager
```

`NODE_ENV` is a framework/runtime mode and does not determine business-environment ownership. `ALSVID_ENV=development|production` is the ALSVID environment label.

## 5. Delivery rule

The standard remote-development path is:

```text
feature branch / pull request into develop
        ↓
CI / build / architecture checks
        ↓
ALSVID Development Deploy
        ↓
Google Cloud Run — alsvid-dev
        ↓
owner acceptance
        ↓
develop -> main release PR (identical tested source content)
        ↓
ALSVID Production Deploy
        ↓
Google Cloud Run — alsvid-prod
```

A Production deployment must come from an approved commit merged into `main`. Development acceptance promotes a software version only; it never promotes Development data or files into Production.

The Production workflow verifies successful Development deployment and CI/container checks for the same Git tree before deploying. Explicit rollback can select a previously successful Production release. After release, synchronize main history into develop; newer features stay in Development until their own acceptance.

## 6. Environment audit rule

An environment audit must inspect the real deployment chain:

```text
GitHub Actions
  -> GitHub Environment (development | production)
  -> Google Workload Identity
  -> Google Cloud project
  -> Cloud Run / Secret Manager
  -> Neon database
  -> R2 object storage
```

For each cloud environment, record the application deployment, database, object storage and secret bindings. Do not infer cloud state from local files.

## 7. Configuration drift guards

The following are invalid and must fail deployment or startup when detectable:

```text
Development application -> alsvid-prod resources
Development application -> Production database
Development application -> Production R2 bucket
Development application -> Production secrets
Production application  -> Development resources
```

The Development deployment workflow must explicitly refuse `GCP_PROJECT_ID` values other than `alsvid-dev` and must refuse the canonical Production R2 bucket.

## 8. UI naming

Use these names consistently:

```text
开发环境  = Development
正式环境  = Production
```

The Development banner and browser title must say `开发` / `Development`, not `测试` / `Test`.

Future agents and developers must preserve this model unless a reviewed architecture decision explicitly changes it.
