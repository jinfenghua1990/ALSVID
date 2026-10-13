interface NavigationItem {
  label: string;
  href: string;
  area?: string;
  section?: string;
  active?: boolean;
  disabled?: boolean;
}

export function navigationArea(item: NavigationItem): string {
  return item.area ?? item.section ?? '首页';
}

export function contextualHref(href: string, area: string): string {
  const url = new URL(href, 'https://alsvid.invalid');
  url.searchParams.set('nav', area);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveNavigation<T extends NavigationItem>(navigation: readonly T[], location?: string) {
  const url = location ? new URL(location, 'https://alsvid.invalid') : undefined;
  const requestedArea = url?.searchParams.get('nav');
  const inferredArea = navigation.find((item) => item.active);
  // Shared destinations such as /overview retain the module the user selected.
  const activeArea = requestedArea && navigation.some((item) => navigationArea(item) === requestedArea && !item.disabled)
    ? requestedArea
    : inferredArea ? navigationArea(inferredArea) : navigationArea(navigation[0] ?? { label: '', href: '' });
  const items = navigation.filter((item) => navigationArea(item) === activeArea);
  const details = items.filter((item) => item.label !== activeArea);
  const contextualNavigation = details.length ? details : items;
  const exact = url && contextualNavigation.find((item) => !item.disabled && item.href === `${url.pathname}${url.hash}`);
  const activeHref = exact?.href ?? contextualNavigation.find((item) => item.active)?.href;
  const activeIndex = contextualNavigation.findIndex((item) => !item.disabled && item.href === activeHref);
  return {
    activeArea,
    contextualNavigation: contextualNavigation.map((item, index) => ({ ...item, active: index === activeIndex })),
    areas: Array.from(new Set(navigation.map(navigationArea))).map((label) => {
      const enabled = navigation.find((item) => navigationArea(item) === label && !item.disabled);
      return { label, href: enabled ? contextualHref(enabled.href, label) : '#', disabled: !enabled, active: label === activeArea };
    }),
  };
}
