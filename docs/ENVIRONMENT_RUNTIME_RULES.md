# ALSVID Environment Runtime Rules

## Local M1 Development is not ALSVID Test Environment

This decision corrects a previous discussion ambiguity.

## Environment Model

ALSVID currently maintains two cloud environments:

1. Test Environment
2. Production Environment

The developer M1 machine is only a local development environment.

```
GitHub Repository
        |
        ↓
M1 Local Development
(build / debug / local Docker)
        |
        ↓
ALSVID Test Cloud Environment
(Test Database / Test R2 / Test Secrets)
        |
        ↓
ALSVID Production Cloud Environment
(Production Database / Production R2 / Production Secrets)
```

## Rules

- Local Docker PostgreSQL, localhost ports, and compose files are developer convenience tools only.
- Local Docker configuration must not be treated as ALSVID Test Environment.
- Test and Production are both cloud environments and must remain isolated.
- Environment verification must check actual cloud bindings:
  - GitHub Actions
  - Cloud Run
  - Secret Manager
  - Cloud database
  - Object storage

## Correction

Previous discussion incorrectly mixed Local Docker Test configuration with cloud Test Environment.

Future agents must distinguish:

`Local Development ≠ Test Environment ≠ Production Environment`
