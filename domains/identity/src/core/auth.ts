export const Permission = {
  IdentityUserRead: 'identity.user.read',
  IdentityRoleManage: 'identity.role.manage',
  AuditRead: 'audit.read',
  PartnerRead: 'partner.read',
  PartnerWrite: 'partner.write',
  PartnerRoleManage: 'partner.role.manage',
} as const;

export type PermissionId = (typeof Permission)[keyof typeof Permission];

export type PasswordState = 'UNSET' | 'INITIAL' | 'ACTIVE' | 'RESET_REQUIRED';

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  /** Internal lifecycle detail used by account/security management surfaces. */
  passwordState?: PasswordState;
  /** When true, normal business APIs must remain blocked until a new password is set. */
  passwordSetupRequired?: boolean;
}
