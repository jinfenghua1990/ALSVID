# ALSVID

Standalone operating platform for the ALSVID bicycle business.

`jinfenghua1990/ALSVID` is the sole long-term implementation authority for ALSVID product engineering, bicycle lifecycle, dealer operations, customer ownership, after-sales, assets and the foreign-trade operating flows needed for Germany, Austria and future EU markets.

## Current authority

ALSVID is fully separated from the ChaiBen-OS application boundary. The old ChaiBen ALSVID implementation is legacy retirement/history only and must not receive new ALSVID features.

The legacy ChaiBen ALSVID workspace contains no business data that needs preservation, so standalone ALSVID uses a zero-data cutover: initialize the standalone schema and bootstrap reference data instead of inventing or migrating historical business rows.

See `docs/CURRENT_STATE.md` for the current authoritative project state.

## Hard boundaries

- ALSVID is the application/repository boundary; it is not a Workspace inside ChaiBen-OS.
- 1688, 吉客云/JackYun and 卖咖啡的熊 do not belong in this repository.
- Shopify stays an external OMS; ALSVID stores only the internal facts it owns.
- One physical bicycle has exactly one canonical Vehicle and one immutable unique frame number.
- Vehicle history is append-oriented and birth/build evidence is immutable.
- PostgreSQL stores authoritative metadata/business facts; R2/S3-compatible object storage stores binaries.
- Money uses Decimal/NUMERIC. External platform identifiers never replace internal stable IDs.
- Live database/R2 credentials are deployment secrets and must never be committed to Git.

## Current standalone capabilities

- authentication / authorization
- Product / SKU foundation
- FC / FT / CT / GT engineering
- Parts / BOM / released revisions
- R2/S3-compatible asset service/API
- Vehicle identity / lifecycle
- Vehicle Center / Vehicle 360 API
- Dealer Portal
- My ALSVID claim / Garage / consent evidence
- Warranty / ServiceCase
- Customer Center API
- Service Center API

Future export procurement, warehouse/inventory/logistics, finance and polished standalone UI are new ALSVID development, not migration debt. They must be designed for ALSVID export operations rather than copied from DOMESTIC workflows.

## Target entrances

- Internal Admin
- Dealer Portal
- My ALSVID customer experience
- Narrow public/service flows

All entrances use the same authoritative ALSVID domain facts with explicit authorization.

## Infrastructure

### PostgreSQL

The runtime uses `ALSVID_DATABASE_URL`. Schema changes go through Alembic.

### R2 / S3-compatible object storage

Binary assets use the `ALSVID_R2_*` environment configuration. The database stores asset metadata; R2 stores bytes. Browser clients never receive storage credentials.

### Shopify

Shopify remains the external OMS and is integrated only through mappings/confirmed facts owned by ALSVID.

## Development

Python 3.12+.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
```

Create the PostgreSQL database referenced by `ALSVID_DATABASE_URL`, then apply the standalone schema and seed ALSVID reference data:

```bash
alembic upgrade head
python -m alsvid.bootstrap
```

Start the API:

```bash
uvicorn alsvid.main:app --app-dir apps/api --host 127.0.0.1 --port 8200
```

Health check: `GET /health`.

Do not use `Base.metadata.create_all()` as a deployment path; schema changes go through Alembic revisions.

Before meaningful domain work read, in order: `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/DATA_OWNERSHIP.md`, then the relevant current Issue/PR and code/tests.
