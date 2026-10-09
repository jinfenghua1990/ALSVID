from sqlalchemy import select
from sqlalchemy.orm import Session

from alsvid.db import get_session_factory
from alsvid.models.core import Permission, Role, RolePermission
from alsvid.models.engineering import ProductPlatform

ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    "ADMIN": ("*",),
    "ALSVID_PRODUCT": (
        "alsvid.product.read",
        "alsvid.product.write",
        "alsvid.vehicle.read",
        "alsvid.vehicle.write",
    ),
    "ALSVID_SERVICE": (
        "alsvid.service.read",
        "alsvid.service.write",
        "alsvid.product.read",
        "alsvid.customer.read",
        "alsvid.vehicle.read",
    ),
    "ALSVID_DEALER": (
        "alsvid.dealer.read",
        "alsvid.dealer.receive",
        "alsvid.dealer.pdi",
        "alsvid.dealer.handover",
        "alsvid.dealer.service.read",
    ),
    "ALSVID_BUYER": (
        "alsvid.buyer.read",
        "alsvid.buyer.write",
    ),
    "ALSVID_SUPPLY_CHAIN": (
        "alsvid.supply_chain.read",
        "alsvid.supply_chain.write",
        "alsvid.vehicle.read",
        "alsvid.vehicle.write",
        "alsvid.product.read",
    ),
    "ALSVID_FINANCE": (
        "alsvid.finance.read",
        "alsvid.finance.write",
    ),
    "ALSVID_VIEWER": (
        "alsvid.dashboard.read",
        "alsvid.product.read",
        "alsvid.vehicle.read",
    ),
}

ROLE_NAMES: dict[str, str] = {
    "ADMIN": "ALSVID Administrator",
    "ALSVID_PRODUCT": "ALSVID Product",
    "ALSVID_SERVICE": "ALSVID Service",
    "ALSVID_DEALER": "ALSVID Dealer",
    "ALSVID_BUYER": "ALSVID Buyer",
    "ALSVID_SUPPLY_CHAIN": "ALSVID Supply Chain",
    "ALSVID_FINANCE": "ALSVID Finance",
    "ALSVID_VIEWER": "ALSVID Viewer",
}

PERMISSION_NAMES: dict[str, str] = {
    "*": "All ALSVID permissions",
    "alsvid.dashboard.read": "Read ALSVID operating dashboard",
    "alsvid.product.read": "Read ALSVID product and engineering data",
    "alsvid.product.write": "Manage ALSVID product and engineering data",
    "alsvid.vehicle.read": "Read ALSVID Vehicle 360 and lifecycle",
    "alsvid.vehicle.write": "Manage ALSVID vehicle lifecycle",
    "alsvid.customer.read": "Read authorized ALSVID customer lifecycle and consent evidence",
    "alsvid.service.read": "Read ALSVID warranty and service cases",
    "alsvid.service.write": "Manage ALSVID warranty and service cases",
    "alsvid.dealer.read": "Read assigned ALSVID dealer portal",
    "alsvid.dealer.receive": "Receive assigned ALSVID vehicles",
    "alsvid.dealer.pdi": "Complete ALSVID vehicle PDI",
    "alsvid.dealer.handover": "Record ALSVID vehicle buyer handover",
    "alsvid.dealer.service.read": "Read authorized dealer service cases",
    "alsvid.buyer.read": "Read own My ALSVID Garage",
    "alsvid.buyer.write": "Manage own My ALSVID Garage and consent",
    "alsvid.supply_chain.read": "Read ALSVID procurement, production, warehouse and logistics",
    "alsvid.supply_chain.write": "Manage ALSVID procurement, production, warehouse and logistics",
    "alsvid.finance.read": "Read ALSVID commercial finance facts",
    "alsvid.finance.write": "Manage ALSVID commercial finance facts",
}

PLATFORMS = (
    ("FC", "Folding Carbon", "折叠碳纤维平台"),
    ("FT", "Fat Tire", "胖胎平台"),
    ("CT", "City Touring", "城市通勤平台"),
    ("GT", "Grand Touring", "长途旅行平台"),
)


def bootstrap_reference_data(db: Session) -> None:
    roles: dict[str, Role] = {}
    for code, name in ROLE_NAMES.items():
        role = db.scalar(select(Role).where(Role.code == code))
        if role is None:
            role = Role(code=code, name=name)
            db.add(role)
            db.flush()
        roles[code] = role

    permissions: dict[str, Permission] = {}
    for code, name in PERMISSION_NAMES.items():
        permission = db.scalar(select(Permission).where(Permission.code == code))
        if permission is None:
            permission = Permission(code=code, name=name)
            db.add(permission)
            db.flush()
        permissions[code] = permission

    for role_code, permission_codes in ROLE_PERMISSIONS.items():
        role = roles[role_code]
        for permission_code in permission_codes:
            permission = permissions[permission_code]
            existing = db.scalar(
                select(RolePermission).where(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == permission.id,
                )
            )
            if existing is None:
                db.add(RolePermission(role_id=role.id, permission_id=permission.id))

    for code, name, meaning in PLATFORMS:
        if db.scalar(select(ProductPlatform).where(ProductPlatform.code == code)) is None:
            db.add(ProductPlatform(code=code, name=name, meaning=meaning))

    db.commit()


def main() -> None:
    with get_session_factory()() as db:
        bootstrap_reference_data(db)


if __name__ == "__main__":
    main()
