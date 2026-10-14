# ALSVID Environment Runtime Rules

## Environment model

- **Production:** Google Cloud Run in `alsvid-prod`; live business environment.
- **Local development:** developer workstation and Docker Compose.
- **CI:** temporary GitHub-hosted runners and disposable test services.
- **Retired:** cloud Development/Test in `alsvid-dev`; not an active deployment target.

```text
GitHub branch / PR → CI checks → review → main → Production deploy
```

## Rules

- Local and CI databases, object storage and secrets must be isolated from Production.
- Never place Production credentials in local development or CI.
- `ALSVID_ENV` / `NODE_ENV`, Compose names and environment-page labels do not prove actual provider bindings.
- Verify live cloud resources through the provider before claiming they exist, are disabled or have been deleted.
- Do not restore a cloud Development runtime or its workflows without a new reviewed architecture decision.
