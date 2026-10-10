import type { AppNavItem } from '@alsvid/ui';

export const appNavigation: readonly AppNavItem[] = [
  { label: 'Overview', href: '/' },
  { label: 'Product', href: '/product' },
  { label: 'Supply', href: '/supply' },
  { label: 'Commerce', href: '/commerce' },
  { label: 'Vehicle', href: '/vehicles' },
  { label: 'Dealer', href: '/dealers' },
  { label: 'Partners', href: '/partners' },
  { label: 'Finance', href: '/finance' },
  { label: 'Service', href: '#service' },
  { label: 'Communication', href: '#communication' },
] as const;

export function navigationFor(activeHref: string): readonly AppNavItem[] {
  return appNavigation.map((item) => ({ ...item, active: item.href === activeHref }));
}
