import type { AuthContext, PermissionId } from './auth.js';
import { PermissionDeniedError } from './errors.js';

export function assertPermission(context: AuthContext, permission: PermissionId): void {
  if (!context.permissions.includes(permission)) throw new PermissionDeniedError(permission);
}
