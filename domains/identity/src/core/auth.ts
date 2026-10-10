export const Permission = {
  IdentityUserRead: 'identity.user.read',
  IdentityRoleManage: 'identity.role.manage',
  AuditRead: 'audit.read',
  PartnerRead: 'partner.read',
  PartnerWrite: 'partner.write',
  PartnerRoleManage: 'partner.role.manage',
} as const;

export type PermissionId = (typeof Permission)[keyof typeof Permission];

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}
