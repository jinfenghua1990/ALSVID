'use client';

import {
  createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore,
  type Dispatch, type MouseEvent, type ReactNode, type SetStateAction,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WorkspaceNavigationProvider } from '@alsvid/ui';
import {
  createAdminWorkspaceDraftStore, isSafeAdminRoute,
  type AdminWorkspaceDraftStore,
} from './workspace-state-store';

const DraftContext = createContext<AdminWorkspaceDraftStore | null>(null);

/**
 * Opt-in ephemeral state for an Admin client screen, kept in the authenticated
 * Admin layout across Next App Router transitions. Not a general RSC/page cache.
 * Server facts and remote mutations must NOT be stored here.
 */
export function useAdminWorkspaceState<T>(
  name: string, initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const store = useContext(DraftContext);
  if (!store) throw new Error('useAdminWorkspaceState requires AdminWorkspaceKeeper');
  const route = usePathname();
  const initialRef = useRef(initial);
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(route, name, listener),
    [store, route, name],
  );
  const read = useCallback(
    () => store.read(route, name, initialRef.current),
    [store, route, name],
  );
  const value = useSyncExternalStore(subscribe, read, () => initialRef.current);
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    const previous = store.read(route, name, initialRef.current);
    const next = typeof update === 'function'
      ? (update as (current: T) => T)(previous) : update;
    store.write(route, name, next);
  }, [store, route, name]);
  return [value, setValue];
}

/**
 * Client navigation only for authenticated /admin URLs. The draft store is
 * mounted inside AdminLayout and disappears on refresh, logout or full nav.
 * Unlike global Next cacheComponents, it cannot change public page caching.
 */
export function AdminWorkspaceKeeper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const location = pathname + (query ? '?' + query : '');
  const router = useRouter();
  const draftsRef = useRef<AdminWorkspaceDraftStore | null>(null);
  if (!draftsRef.current) draftsRef.current = createAdminWorkspaceDraftStore();
  const drafts = draftsRef.current;

  useEffect(() => { drafts.touch(pathname); }, [drafts, pathname]);

  const navigate = useCallback((url: string) => {
    if (isSafeAdminRoute(url)) router.push(url);
    else window.location.assign(url);
  }, [router]);

  const close = useCallback((url: string) => {
    if (isSafeAdminRoute(url)) {
      drafts.evict(new URL(url, window.location.origin).pathname);
    }
  }, [drafts]);

  const captureAdminLink = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target as Element | null;
    const link = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    const href = link.getAttribute('href');
    if (!href || !isSafeAdminRoute(href)) return;
    event.preventDefault();
    router.push(href);
  }, [router]);

  return <DraftContext.Provider value={drafts}>
    <WorkspaceNavigationProvider location={location} navigate={navigate} close={close}>
      <div data-admin-workspace-drafts="ephemeral" onClickCapture={captureAdminLink}>
        {children}
      </div>
    </WorkspaceNavigationProvider>
  </DraftContext.Provider>;
}
