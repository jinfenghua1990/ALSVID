# ALSVID Database Architecture Decision

## 1. Database Strategy Overview

ALSVID adopts PostgreSQL as the long-term database standard.

The database layer must follow these principles:

- Use open standards.
- Avoid excessive platform lock-in.
- Keep business logic independent from database providers.
- Allow future migration between compatible PostgreSQL services.

---

# 2. Why PostgreSQL?

PostgreSQL is selected as the database standard because:

- Mature open-source relational database.
- Strong data consistency.
- Suitable for business systems.
- Large ecosystem.
- Supports complex relationships required by vehicle lifecycle management.

ALSVID data includes:

- Vehicles.
- VIN / frame numbers.
- Customers.
- Dealers.
- Warranty records.
- Repair history.
- Service records.
- External system synchronization records.

These require relational data management rather than a simple document database.

---

# 3. Current Primary Database Choice

## Neon PostgreSQL

Neon PostgreSQL is the current primary database service provider.

Reasons for selection:

- PostgreSQL native.
- Serverless architecture.
- Low operational maintenance.
- Suitable for small teams.
- Supports database branching for development and testing.
- Easy environment separation.

Current decision:

```text
Production Database:
Neon PostgreSQL
```

---

# 4. Alternative Database Option

## Supabase PostgreSQL

Supabase is maintained as a migration backup option.

It is not the current primary choice.

Reasons to keep Supabase as backup:

- PostgreSQL compatible.
- Provides additional backend services.
- Large developer ecosystem.
- Can support future requirements if ALSVID needs more integrated services.

Current decision:

```text
Primary:
Neon PostgreSQL

Alternative:
Supabase PostgreSQL
```

---

# 5. Why Not Use Local PostgreSQL as the Normal Test Authority?

ALSVID development uses an M1 computer for compute, but the normal Test database remains managed and cloud-based.

Recommended model:

```text
M1 + Docker
    |
    v
Neon Test resources
```

Reasons:

- keeps database behavior closer to Production;
- validates TLS/managed-service connection behavior;
- avoids maintaining a local database as the authoritative Test environment;
- allows Neon branching/reset workflows;
- reduces differences between Test and Production.

Local PostgreSQL may still be used for true offline work or isolated low-level tests, but it is not the normal Test authority.

---

# 6. Test and Production Separation

Test and Production must use separate database resources.

Conceptually:

```text
Neon Test

Neon Production
```

Production data must never be used directly for destructive testing, migration experiments or seed/reset workflows.

Test approval promotes a software version/commit, not Test data.

---

# 7. Data Ownership Principle

ALSVID does not become the source system for every business process.

Data ownership:

Shopify:

- Commerce transactions.
- Orders.
- Payments/refunds and storefront transaction facts.

WMS:

- Inventory execution.
- Warehouse operations.
- Shipment/dispatch execution.

ALSVID:

- Vehicle lifecycle.
- Customer/dealer service relationships.
- Warranty information.
- Repair/service history.
- Important external business facts required for Vehicle 360, My ALSVID and after-sales.

ALSVID stores required business facts, not unnecessary copies of external systems.

---

# 8. Why Neon Rather Than Supabase as Primary Today?

Both are valid PostgreSQL platforms. Neon is primary today because ALSVID already owns its application/API/identity/domain layers and uses Cloudflare R2 for files. A focused managed PostgreSQL provider keeps the initial infrastructure simpler and avoids adopting platform capabilities ALSVID does not currently need.

Supabase remains explicitly approved as a migration alternative because it preserves PostgreSQL compatibility and may become attractive if its integrated capabilities provide real future value.

---

# 9. Future Migration Principle

If the database provider changes in the future, the business layer should remain unchanged as far as reasonably possible.

Migration target:

```text
PostgreSQL-compatible managed database
```

Provider-specific features must not leak into core business rules unless intentionally documented and justified.

A future switch from Neon to Supabase (or another PostgreSQL provider) should be treated as an infrastructure migration, not a redesign of ALSVID.