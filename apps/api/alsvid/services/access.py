from sqlalchemy import select
from sqlalchemy.orm import Session

from alsvid.models.core import Permission, Role, RolePermission, User, UserRole


class AccessDenied(PermissionError):
    pass


def permissions_for_user(db: Session, *, user_id: str) -> frozenset[str]:
    user = db.get(User, user_id)
    if user is None or not user.active:
        return frozenset()

    permissions = db.scalars(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
        .distinct()
    ).all()
    return frozenset(permissions)


def allows(permissions: frozenset[str], permission: str) -> bool:
    return "*" in permissions or permission in permissions


def require_permission(db: Session, *, user_id: str, permission: str) -> frozenset[str]:
    permissions = permissions_for_user(db, user_id=user_id)
    if not allows(permissions, permission):
        raise AccessDenied(f"missing permission: {permission}")
    return permissions
