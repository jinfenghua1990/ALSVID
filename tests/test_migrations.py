from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

import alsvid.models  # noqa: F401
from alsvid.db import Base


def test_standalone_baseline_upgrade_matches_model_tables_and_columns(tmp_path) -> None:
    database_path = tmp_path / "alsvid-migration.db"
    url = f"sqlite+pysqlite:///{database_path}"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)

    command.upgrade(config, "head")

    engine = create_engine(url)
    inspector = inspect(engine)
    expected_tables = set(Base.metadata.tables)
    actual_tables = set(inspector.get_table_names()) - {"alembic_version"}
    assert actual_tables == expected_tables

    for table_name in expected_tables:
        expected_columns = set(Base.metadata.tables[table_name].columns.keys())
        actual_columns = {column["name"] for column in inspector.get_columns(table_name)}
        assert actual_columns == expected_columns, table_name

    command.downgrade(config, "base")
    remaining = set(inspect(engine).get_table_names())
    assert remaining <= {"alembic_version"}
