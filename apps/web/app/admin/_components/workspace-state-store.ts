/**
 * Ephemeral, per-authenticated-Admin-layout UI draft cache.
 * No cookies, browser storage, backend writes or Next.js global cache changes.
 * Only screens that opt into useAdminWorkspaceState retain local state.
 */
export const MAX_DRAFT_WORKSPACES = 4;

export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
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
  const routes = new Map<string, Map<string, unknown>>();
  const listeners = new Map<string, Set<() => void>>();
  const channel = (path: string, key: string) => path + '\u0000' + key;

  function emitRoute(path: string) {
    for (const [name, callbacks] of listeners) {
      if (name.startsWith(path + '\u0000')) {
        for (const callback of callbacks) callback();
      }
    }
  }

  function touch(path: string) {
    if (!isAdminPath(path)) throw new Error('Admin drafts must be scoped to /admin');
    const values = routes.get(path) ?? new Map<string, unknown>();
    routes.delete(path);
    routes.set(path, values);
    while (routes.size > capacity) {
      const oldest = routes.keys().next().value as string;
      routes.delete(oldest);
      emitRoute(oldest);
    }
  }

  function read<T>(path: string, key: string, initial: T): T {
    const values = routes.get(path);
    return values?.has(key) ? values.get(key) as T : initial;
  }

  function write<T>(path: string, key: string, value: T) {
    if (!isAdminPath(path)) throw new Error('Admin drafts must be scoped to /admin');
    touch(path);
    const values = routes.get(path)!;
    if (values.has(key) && Object.is(values.get(key), value)) return;
    values.set(key, value);
    for (const listener of listeners.get(channel(path, key)) ?? []) listener();
  }

  function subscribe(path: string, key: string, listener: () => void) {
    const name = channel(path, key);
    const callbacks = listeners.get(name) ?? new Set<() => void>();
    callbacks.add(listener);
    listeners.set(name, callbacks);
    return () => {
      callbacks.delete(listener);
      if (callbacks.size === 0) listeners.delete(name);
    };
  }

  function evict(path: string) {
    if (routes.delete(path)) emitRoute(path);
  }

  function clear() {
    for (const path of [...routes.keys()]) evict(path);
  }

  return { read, write, subscribe, touch, evict, clear, size: () => routes.size };
}

export type AdminWorkspaceDraftStore = ReturnType<typeof createAdminWorkspaceDraftStore>;
