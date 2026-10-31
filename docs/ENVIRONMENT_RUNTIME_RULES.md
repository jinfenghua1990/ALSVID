# ALSVID Environment Runtime Rules

## Environment model

- **Production:** the single live business system and source of identity, business data and R2 objects, shared by authorized computers. Verify the live project and bindings.
- **Local development:** allowed; actual deployments and business sessions connect to the same Production services and data. Never substitute a local database or mock storage without clearly identifying that it is not the business system.
- **CI:** ephemeral synthetic fixtures for automated checks, not a separate business deployment.
- **Retired:** cloud Development/Test in `alsvid-dev`; do not recreate it.

```text
GitHub branch / PR → CI checks → review → main → Production deploy
```

## Rules

- Use authorized access to Production services for actual business use on each computer; keep secrets out of Git and logs. Do not initialize, overwrite or delete production data during setup or validation.
- Automated CI must not use Production credentials or business data.
- `ALSVID_ENV` / `NODE_ENV`, Compose names and environment-page labels do not prove actual provider bindings.
- Verify live cloud resources through the provider before claiming they exist, are disabled or have been deleted.
- Do not restore a cloud Development runtime or its workflows without a new reviewed architecture decision.
