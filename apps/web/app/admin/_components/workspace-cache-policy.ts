/** Limits live React workspaces, not the eight visible tab bookmarks in sessionStorage. */
export const MAX_LIVE_ADMIN_WORKSPACES = 4;

export function isSafeAdminRoute(raw: string): boolean {
  if(typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return false;
  try {
    const value = new URL(raw,'https://alsvid.invalid');
    return value.origin === 'https://alsvid.invalid' &&
      (value.pathname === '/admin' || value.pathname.startsWith('/admin/'));
  } catch {return false;}
}

export function cachedRouteOrder(
  current:readonly string[],next:string,limit=MAX_LIVE_ADMIN_WORKSPACES,
):string[] {
  if(!isSafeAdminRoute(next))throw new Error('Only Admin routes can be cached');
  const safeLimit = Math.max(1,Math.min(4,Math.trunc(limit)));
  const prior = current.filter(path=>path!==next&&isSafeAdminRoute(path));
  return [...new Set([...prior,next])].slice(-safeLimit);
}
