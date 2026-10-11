# ALSVID Environment Architecture

> Status: Confirmed  
> Purpose: Prevent confusion between local development, cloud Test, and Production environments.

## 1. Environment model

ALSVID currently recognizes two cloud runtime environments:

1. Test
2. Production

A developer machine such as the M1 Mac is a separate Local Development environment. It is not the ALSVID Test environment.

```text
Local Development != Cloud Test != Production
```

Do not add a third cloud runtime environment at the current stage.

## 2. Local Development

The local machine is development support infrastructure. It may use:

- Docker Compose;
- localhost PostgreSQL;
- localhost services;
- temporary containers;
- local gateways and development watchers.

For example, localhost port 5433 represents a temporary database on the developer machine. It does not prove which database the cloud Test application uses.

A local Compose file is an implementation tool for local development and acceptance. It must not be used as evidence of the live cloud Test or Production resource binding.

## 3. Cloud Test

Cloud Test is an independent environment intended to approximate Production behavior.

It must have separate resources:

- Test application deployment;
- Test PostgreSQL database, such as alsvid-test-db;
- Test object-storage bucket, such as alsvid-test-assets;
- Test-only secrets and API keys.

Test data and files must never be stored in Production resources.

## 4. Production

Production is the live business environment and must have separate resources:

- Production application deployment;
- Production PostgreSQL database, such as alsvid-prod-db;
- Production object-storage bucket, such as alsvid-prod-assets;
- Production-only secrets and API keys.

The same variable names may be used in both environments, but the injected values and secret targets must be different.

For example:

```text
Test:
DATABASE_URL -> Test database
R2_BUCKET    -> Test bucket
secrets      -> Test secrets

Production:
DATABASE_URL -> Production database
R2_BUCKET    -> Production bucket
secrets      -> Production secrets
```

NODE_ENV=test does not automatically redirect an application to Test resources. Resource isolation is determined by the actual deployment bindings and injected values.

## 5. Environment audit rule

An environment audit must inspect the actual deployment path, not only local source files:

```text
GitHub Actions
  -> Cloud Run or deployment platform
  -> Secret Manager bindings
  -> Database binding
  -> Object-storage binding
```

For each environment, record:

- Application deployment;
- Database;
- Object storage;
- Secrets.

Do not infer cloud state from docker-compose files, .env.example, checkout names, or port numbers.

## 6. Configuration drift

The following are configuration drift:

```text
Cloud Test application -> Production database
Cloud Test application -> Production object-storage bucket
Cloud Test application -> Production secrets
```

When drift is found:

1. confirm the actual binding;
2. correct the Secret Manager or deployment configuration;
3. update this documentation if the architecture rule changed;
4. record the evidence and correction in GitHub.

## 7. Delivery rule

Local development proceeds on the M1. A tested commit is then promoted through GitHub to Cloud Test and, after explicit Production approval, to Production.

Test approval promotes a software version, not Test data.

Future agents and developers must preserve this model unless a reviewed architecture decision explicitly changes it.
