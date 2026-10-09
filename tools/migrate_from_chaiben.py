#!/usr/bin/env python3
import argparse
import json
import os
import sys

from alsvid.migration.chaiben import LegacyMigrationError, migrate_database_urls


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Migrate ALSVID-owned data from legacy ChaiBen-OS into standalone ALSVID."
    )
    parser.add_argument(
        "--source-url",
        default=os.getenv("CHAIBEN_DATABASE_URL"),
        help="Legacy ChaiBen-OS PostgreSQL URL (or CHAIBEN_DATABASE_URL).",
    )
    parser.add_argument(
        "--target-url",
        default=os.getenv("ALSVID_DATABASE_URL"),
        help="Standalone ALSVID PostgreSQL URL (or ALSVID_DATABASE_URL).",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Commit the migration. Without this flag the complete migration is rolled back.",
    )
    return parser


def main() -> int:
    args = _parser().parse_args()
    if not args.source_url or not args.target_url:
        print(
            "Both source and target database URLs are required. Use --source-url/--target-url "
            "or CHAIBEN_DATABASE_URL/ALSVID_DATABASE_URL.",
            file=sys.stderr,
        )
        return 2
    try:
        report = migrate_database_urls(
            source_url=args.source_url,
            target_url=args.target_url,
            apply=args.apply,
        )
    except LegacyMigrationError as exc:
        print(f"Migration blocked: {exc}", file=sys.stderr)
        return 2

    print(json.dumps(report.as_dict(), indent=2, default=str, sort_keys=True))
    if not report.ready:
        return 2
    if not args.apply:
        print("Dry-run complete. No target writes were committed.", file=sys.stderr)
    else:
        print("Migration committed. Run the documented post-cutover verification before retiring ChaiBen-OS.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
