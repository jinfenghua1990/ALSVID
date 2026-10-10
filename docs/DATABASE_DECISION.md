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

```
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

```
Primary:
Neon PostgreSQL

Alternative:
Supabase PostgreSQL
```

---

# 5. Why Not Build Database Locally?

ALSVID development uses a local M1 computer, but the database should remain cloud-based for testing.

Recommended model:

```
M1 Local Computer
        |
        |
        v
Neon Test Database
```

Reasons:

- Keeps development closer to production behavior.
- Avoids local database maintenance.
- Allows database branching and reset.
- Prevents environment differences.

---

# 6. Test and Production Separation

Database environments should be separated when production deployment begins.

Recommended:

```
Neon Production
        |
        |
Neon Test
```

Production data must never be used directly for testing.

---

# 7. Data Ownership Principle

ALSVID does not become the source system for every business process.

Data ownership:

Shopify:

- Commerce transactions.
- Orders.
- Payments.

WMS:

- Inventory execution.
- Warehouse operations.
- Shipment execution.

ALSVID:

- Vehicle lifecycle.
- Customer service history.
- Warranty information.
- Repair records.
- Important business data relationships.

ALSVID stores required business facts, not unnecessary copies of external systems.

---

# 8. Future Migration Principle

If database provider changes in the future:

The business layer should remain unchanged.

Migration target:

```
PostgreSQL compatible database
```

The application architecture should not depend on provider-specific features unless intentionally documented.
