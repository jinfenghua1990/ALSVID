'use client';

import { useCallback, type MouseEvent, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WorkspaceNavigationProvider } from '@alsvid/ui';
import { isSafeAdminRoute } from './workspace-cache-policy';

/**
 * Next.js Cache Components owns the actual route-level React Activity cache.
 * This component only converts native Admin anchor links into soft navigations,
 * so the framework can preserve up to three previously visited route instances.
 * Nothing is serialized to persistent storage; logout uses full page navigation.
 */
export function AdminWorkspaceKeeper({children}:{children:ReactNode}){
  const pathname=usePathname();
  const search=useSearchParams().toString();
  const location=pathname+(search?'?'+search:'');
  const router=useRouter();

  const navigate=useCallback((url:string)=>{
    if(!isSafeAdminRoute(url)){
      window.location.assign(url);
      return;
    }
    router.push(url);
  },[router]);

  const close=useCallback((_url:string)=>{
    // The bookmark is closed by WorkspaceTabs. Next's bounded route cache owns
    // physical eviction; its private internals must not be modified here.
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

  return <WorkspaceNavigationProvider location={location} navigate={navigate} close={close}>
    <div data-alsvid-admin-workspace-cache="framework" onClickCapture={captureAdminLink}>
      {children}
    </div>
  </WorkspaceNavigationProvider>;
}
