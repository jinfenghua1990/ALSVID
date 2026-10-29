/**
 * Ephemeral, per-authenticated-Admin-layout UI draft cache.
 * No cookies, browser storage, backend writes or Next.js global cache changes.
 * Only screens that opt into useAdminWorkspaceState retain local state.
 */
export const MAX_DRAFT_WORKSPACES = 4;

function pathnameOf(location: string): string {
  try {
    return new URL(location, 'https://alsvid.invalid').pathname;
  } catch {
    return location.split(/[?#]/, 1)[0];
  }
}

export function isAdminPath(path: string): boolean {
  const pathname = pathnameOf(path);
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isSafeAdminRoute(raw: string): boolean {
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return false;
  try {
    const url = new URL(raw, 'https://alsvid.invalid');
    return url.origin === 'https://alsvid.invalid' && isAdminPath(url.pathname);
  } catch {
    return false;
  }
}

export function createAdminWorkspaceDraftStore(limit = MAX_DRAFT_WORKSPACES) {
  const capacity = Math.max(1, Math.min(MAX_DRAFT_WORKSPACES, Math.trunc(limit)));
  const locations = new Map<string, Map<string, unknown>>();
  const listeners = new Map<string, Set<() => void>>();
  const channel = (location: string, key: string) => location + '\\u0000' + key;

  function emitLocation(location: string) {
    for (const [name, callbacks] of listeners) {
      if (name.startsWith(location + '\\u0000')) {
        for (const callback of callbacks) callback();
      }
    }
  }

  function touch(location: string) {
    if (!isAdminPath(location)) throw new Error('Admin drafts must be scoped to /admin');
    const values = locations.get(location) ?? new Map<string, unknown>();
    locations.delete(location);
    locations.set(location, values);
    while (locations.size > capacity) {
      const oldest = locations.keys().next().value as string;
      locations.delete(oldest);
      emitLocation(oldest);
    }
  }

  function read<T>(location: string, key: string, initial: T): T {
    const values = locations.get(location);
    return values?.has(key) ? values.get(key) as T : initial;
  }

  function write<T>(location: string, key: string, value: T) {
    if (!isAdminPath(location)) throw new Error('Admin drafts must be scoped to /admin');
    touch(location);
    const values = locations.get(location)!;
    if (values.has(key) && Object.is(values.get(key), value)) return;
    values.set(key, value);
    for (const listener of listeners.get(channel(location, key)) ?? []) listener();
  }

  function subscribe(location: string, key: string, listener: () => void) {
    const name = channel(location, key);
    const callbacks = listeners.get(name) ?? new Set<() => void>();
    callbacks.add(listener);
    listeners.set(name, callbacks);
    return () => {
      callbacks.delete(listener);
      if (callbacks.size === 0) listeners.delete(name);
    };
  }

  function evict(location: string) {
    if (locations.delete(location)) emitLocation(location);
  }

  function clear() {
    for (const location of [...locations.keys()]) evict(location);
  }

  return { read, write, subscribe, touch, evict, clear, size: () => locations.size };
}

export type AdminWorkspaceDraftStore = ReturnType<typeof createAdminWorkspaceDraftStore>;
