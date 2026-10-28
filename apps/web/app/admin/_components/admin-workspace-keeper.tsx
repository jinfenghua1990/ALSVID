'use client';

import { Activity, useCallback, useState, type MouseEvent, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WorkspaceNavigationProvider } from '@alsvid/ui';
import { cachedRouteOrder, isSafeAdminRoute } from './workspace-cache-policy';

type CachedPage = { path:string; content:ReactNode };
type CacheState = { active:string; pages:CachedPage[] };

/**
 * React Activity retains mounted component state while disabling hidden effects.
 * Next client navigation is essential: a full <a href> reload discards this cache.
 * Nothing is serialized to storage; a hard refresh, logout, or new session clears it.
 */
export function AdminWorkspaceKeeper({children}:{children:ReactNode}){
  const pathname=usePathname();
  const search=useSearchParams().toString();
  const router=useRouter();
  const path=pathname+(search?'?'+search:'');
  const [cache,setCache]=useState<CacheState>(()=>({
    active:path,pages:[{path,content:children}],
  }));

  // A guarded same-component update keeps the old Activity keyed and mounted
  // during an App Router transition, before its previous children can unmount.
  if(cache.active!==path){
    const keys=cachedRouteOrder(cache.pages.map(page=>page.path),path);
    const current=new Map(cache.pages.map(page=>[page.path,page.content]));
    setCache({active:path,pages:keys.map(key=>({
      path:key,content:current.get(key)??children,
    }))});
  }

  const navigate=useCallback((url:string)=>{
    if(!isSafeAdminRoute(url)){
      // Leaving Admin must be a full navigation: never cache authenticated DOM.
      window.location.assign(url);
      return;
    }
    router.push(url);
  },[router]);

  const close=useCallback((url:string)=>{
    const key=url.split('#')[0]!;
    setCache(prev=>({...prev,pages:prev.pages.filter(page=>page.path!==key)}));
  },[]);

  const captureAdminLink=useCallback((event:MouseEvent<HTMLDivElement>)=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||
       event.shiftKey||event.altKey)return;
    const target=event.target as Element|null;
    const link=target?.closest?.('a[href]') as HTMLAnchorElement|null;
    if(!link||link.closest('.workspaceTabs')||link.hasAttribute('download')||
       (link.target&&link.target!=='_self'))return;
    const href=link.getAttribute('href');
    if(!href||!isSafeAdminRoute(href))return;
    event.preventDefault();
    router.push(href);
  },[router]);

  // A newly arrived RSC child replaces the active entry; inactive entries
  // retain their original mounted element and React local state.
  const pages=cache.active===path?cache.pages:(()=>{
    const keys=cachedRouteOrder(cache.pages.map(page=>page.path),path);
    const saved=new Map(cache.pages.map(page=>[page.path,page.content]));
    return keys.map(key=>({path:key,content:saved.get(key)??children}));
  })();

  return <WorkspaceNavigationProvider location={path} navigate={navigate} close={close}>
    <div data-alsvid-admin-workspace-cache="true" onClickCapture={captureAdminLink}>
      {pages.map(page=><Activity key={page.path} mode={page.path===path?'visible':'hidden'}>
        {page.path===path?children:page.content}
      </Activity>)}
    </div>
  </WorkspaceNavigationProvider>;
}
