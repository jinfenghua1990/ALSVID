import type { ReactNode } from 'react';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';

/**
 * Keep the proven domain-connected workspaces usable in their old routes while
 * migrating their presentation into the canonical /admin UI. Neither mode
 * changes the domain API or owns a second set of business facts.
 */
export function OperationsFrame({
  embedded = false,
  area,
  footer,
  children,
}: {
  embedded?: boolean;
  area: 'product' | 'commerce' | 'production' | 'inventory' | 'dealers' | 'supply';
  footer: string;
  children: ReactNode;
}) {
  if (embedded) {
    return <div className="av-live-operations" aria-label="真实业务操作区">{children}</div>;
  }
  return <AppShell navigation={navigationFor('/' + area)} footer={footer}>{children}</AppShell>;
}
