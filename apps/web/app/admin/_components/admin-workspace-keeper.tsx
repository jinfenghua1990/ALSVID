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
 * Next App Router may remount its authenticated layout while navigating,
 * even when a child navigation uses router.push. A ref inside that layout
 * therefore is NOT enough to retain unsaved component drafts.
 *
 * Keep the store in this browser JavaScript realm (never in localStorage,
 * sessionStorage or on the server). Full reload/logout creates a fresh realm.
 * On SSR use an isolated throwaway instance, never a process-wide singleton.
 */
let browserDrafts: AdminWorkspaceDraftStore | null = null;
let browserDraftOwner: string | null = null;
function currentDraftStore(userId: string): AdminWorkspaceDraftStore {
  if (typeof window === 'undefined') return createAdminWorkspaceDraftStore();
  if (!browserDrafts || browserDraftOwner !== userId) {
    browserDrafts?.clear();
    browserDrafts = createAdminWorkspaceDraftStore();
    browserDraftOwner = userId;
  }
  return browserDrafts;
}

let verifiedSessionUserId: string | null = null;

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
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const route = pathname + (query ? '?' + query : '');
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
export function AdminWorkspaceKeeper({ children, userId }: { children: ReactNode; userId: string }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const location = pathname + (query ? '?' + query : '');
  const router = useRouter();
  const drafts = currentDraftStore(userId);

  useEffect(() => { drafts.touch(location); }, [drafts, location]);

  const navigate = useCallback((url: string) => {
    if (!isSafeAdminRoute(url)) {
      window.location.assign(url);
      return;
    }
    // The App Router preserves layouts, so a client transition does not
    // necessarily rerun AdminLayout's server-side session guard.
    // Check authorization before reusing the in-memory authenticated shell.
    void (async () => {
      try {
        const result = await fetch('/api/admin/workspace-session', {
          method: 'GET', credentials: 'same-origin',
          cache: 'no-store', redirect: 'manual',
        });
        if (result.status !== 200 || result.type === 'opaqueredirect') {
          drafts.clear();
          window.location.assign(url);
          return;
        }
        const session: unknown = await result.json();
        const sessionUserId = session && typeof session === 'object' &&
          'userId' in session && typeof session.userId === 'string'
          ? session.userId : null;
        if (!sessionUserId) {
          drafts.clear();
          window.location.assign(url);
          return;
        }
        if (userId !== sessionUserId ||
            (verifiedSessionUserId && verifiedSessionUserId !== sessionUserId)) {
          // A cookie change to another account must never reuse old drafts.
          drafts.clear();
          verifiedSessionUserId = sessionUserId;
          window.location.assign(url);
          return;
        }
        verifiedSessionUserId = sessionUserId;
        router.push(url);
      } catch {
        // Fail closed: full navigation invokes the original AdminLayout guard.
        window.location.assign(url);
      }
    })();
  }, [router, drafts, userId]);

  const close = useCallback((url: string) => {
    if (isSafeAdminRoute(url)) {
      drafts.evict(new URL(url, window.location.origin).pathname + new URL(url, window.location.origin).search);
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
    navigate(href);
  }, [navigate]);

  return <DraftContext.Provider value={drafts}>
    <WorkspaceNavigationProvider location={location} navigate={navigate} close={close}>
      <div data-admin-workspace-drafts="ephemeral" onClickCapture={captureAdminLink}>
        {children}
      </div>
    </WorkspaceNavigationProvider>
  </DraftContext.Provider>;
}
