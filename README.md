# ALSVID

Standalone operating platform for the ALSVID bicycle business.

This repository is the new long-term implementation boundary for ALSVID product engineering, bicycle lifecycle, dealer operations, customer ownership, after-sales, assets and the foreign-trade operating flows needed for Germany, Austria and future EU markets.

## Extraction source

The initial implementation is being extracted from `jinfenghua1990/ChaiBen-OS` starting from source `main` SHA `5cb68246f5049be90f9acdb4d6dc89b7decec803`.

This is not a blind copy. Multi-workspace assumptions, DOMESTIC/卖咖啡的熊 coupling, stale architecture decisions and incorrect code are rewritten as they are migrated.

## Hard boundaries

- ALSVID is the application/repository boundary; it is not a Workspace inside ChaiBen-OS.
- 1688 and 吉客云/JackYun do not belong in this repository.
- Shopify stays an external OMS; ALSVID stores only the internal facts it owns.
- One physical bicycle has exactly one canonical Vehicle and one immutable unique frame number.
- Vehicle history is append-oriented and birth/build evidence is immutable.
- PostgreSQL stores authoritative metadata/business facts; R2/S3-compatible object storage stores binaries.
- Money uses Decimal/NUMERIC. External platform identifiers never replace internal stable IDs.

## Target entrances

- Internal admin
- Dealer Portal
- My ALSVID customer experience
- Narrow public/service flows

All entrances use the same authoritative ALSVID domain facts with explicit authorization.

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

Local port `8200` is intentionally separate from the legacy ChaiBen-OS `8100` runtime during extraction. Do not use `Base.metadata.create_all()` as a deployment path; schema changes go through Alembic revisions.

See `docs/ARCHITECTURE.md`, `docs/DATA_OWNERSHIP.md` and `docs/MIGRATION_INVENTORY.md` before changing domain code.
