import type { ReactNode } from 'react';
import { requirePortalSession } from '../_lib/portal-access';

/**
 * Admin 门户守卫：未登录或权限不足时重定向到 /login。
 * 覆盖 /admin 及全部子路由（workbench v2/v3 与 11 个业务模块）。
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePortalSession('admin', '/admin');
  return <>{children}</>;
}
