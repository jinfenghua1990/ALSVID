# Domains

Business implementation lives here. Add a domain only when there is a real business capability to implement.

Expected internal shape:

```text
<domain>/
  src/core
  src/application
  src/infrastructure
  src/api
```

Rules:

- core has no Nest/Next/provider SDK dependency
- application owns use-cases and ports
- infrastructure implements persistence/provider adapters
- api translates transport DTOs to application commands/queries
- domain tables are private write authority to that domain
- cross-domain behavior uses explicit contracts/events

Do not create empty domain folders merely to mirror the architecture document.
