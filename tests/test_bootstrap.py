from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from alsvid.bootstrap import bootstrap_reference_data
from alsvid.db import Base
from alsvid.models import ProductPlatform, Role


def test_bootstrap_creates_alsvid_roles_and_platforms_without_domestic_workspace() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        bootstrap_reference_data(db)
        bootstrap_reference_data(db)

        role_codes = set(db.scalars(select(Role.code)).all())
        assert role_codes == {
            "ADMIN",
            "ALSVID_PRODUCT",
            "ALSVID_SERVICE",
            "ALSVID_DEALER",
            "ALSVID_BUYER",
            "ALSVID_SUPPLY_CHAIN",
            "ALSVID_FINANCE",
            "ALSVID_VIEWER",
        }
        platforms = db.scalars(select(ProductPlatform.code).order_by(ProductPlatform.code)).all()
        assert platforms == ["CT", "FC", "FT", "GT"]
