'use client';

import { createContext, useContext, useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';
import { contextualHref, navigationArea, resolveNavigation } from './navigation-context';

export { ThemeToggle } from './theme-toggle';

export interface AppNavItem {
  label: string;
  href: string;
  active?: boolean;
  area?: string;
  section?: string;
  status?: string;
  disabled?: boolean;
}

export interface AppShellClassNames {
  shell?: string;
  rail?: string;
  brand?: string;
  nav?: string;
  active?: string;
  footer?: string;
  workspace?: string;
}

const areaIcons: Record<string, string> = {
  工作台: '🏠', 产品: '🧩', 产品研发: '🧩', 订单: '🧾', 订单管理: '🧾',
  电商: '🛒', 生产: '🏭', 生产制造: '🏭', 库存: '🚚', 仓储物流: '🚚',
  经销商: '🏢', '经销商/B2B': '🏢', 客户: '👤', 客户车主: '👤',
  售后: '🛠️', 售后服务: '🛠️', 供应链: '📦', 供应链采购: '📦',
  数据: '📈', 数据分析: '📈', 设置: '⚙️', 财务结算: '💳',
};

const areaDescriptions: Record<string, string> = {
  工作台: '今日运营概览、待办、异常与关键指标',
  产品: '产品平台、型号、SKU、BOM、零件与工程资料',
  订单: 'B2C / B2B 外部订单、履约状态与异常对账',
  生产: '生产计划、工单、装配、质检、VIN 与出厂追溯',
  库存: '成品与零件库存、仓库、调拨、预留与库存预警',
  经销商: '经销商档案、区域授权、采购记录与经营关系',
  客户: '客户档案、车辆绑定、购买记录与服务关系',
  售后: 'VIN 查询、保修、维修工单、配件申请与服务记录',
  供应链: '供应商、采购、来料检测、供应商评价与成本',
  数据: '销售、生产、库存、售后与经销商经营分析',
  设置: '员工、角色权限、审计、集成与运行环境',
};

function NavigationItems({ navigation, activeClassName }: { navigation: readonly AppNavItem[]; activeClassName: string | undefined }) {
  return (
    <>
      {Array.from(new Set(navigation.map((item) => item.section ?? '导航'))).map((section) => {
        const items = navigation.filter((item) => (item.section ?? '导航') === section);
        return (
          <details className="navGroup" key={section} open>
            <summary className="navSection">{section}<span aria-hidden="true">⌄</span></summary>
            {items.map((item) => {
              const itemTitle = `${section} · ${item.label}${item.status ? `（${item.status}）` : ''}`;
              return (
                <div className="navEntry" key={`${item.href}-${item.label}`}>
                  {item.disabled ? (
                    <span className="navItem navItemDisabled" aria-disabled="true" title={itemTitle}>
                      <span className="navLabel">{item.label}</span>
                      {item.status ? <span className="navStatus">{item.status}</span> : null}
                    </span>
                  ) : (
                    <a className={`navItem${item.active ? ` ${activeClassName ?? 'active'}` : ''}`} href={contextualHref(item.href, navigationArea(item))} aria-current={item.active ? 'page' : undefined} title={itemTitle}>
                      <span className="navLabel">{item.label}</span>
                      {item.status ? <span className="navStatus">{item.status}</span> : null}
                    </a>
                  )}
                </div>
              );
            })}
          </details>
        );
      })}
    </>
  );
}


type WorkspaceTab = { path: string; label: string; icon: string };

const WORKSPACE_TAB_ROUTES: readonly { path: string; label: string; icon: string }[] = [
  { path: '/admin/production/vin', label: 'VIN / 车辆查询', icon: '🔎' },
  { path: '/admin/ecommerce/page-builder', label: '商城装修', icon: '🎨' },
  { path: '/admin/ecommerce/products', label: '商城商品列表', icon: '🛒' },
  { path: '/admin/ecommerce/pricing', label: '商城价格管理', icon: '💶' },
  { path: '/admin/ecommerce/orders', label: 'B2C 订单管理', icon: '🧾' },
  { path: '/admin/orders/detail', label: '订单详情', icon: '🧾' },
  { path: '/admin/dealers/detail', label: '经销商档案', icon: '🏢' },
  { path: '/admin/product', label: '产品中心', icon: '📦' },
  { path: '/admin/orders', label: '订单管理', icon: '🧾' },
  { path: '/admin/ecommerce', label: '电商工作台', icon: '🛒' },
  { path: '/admin/production', label: '生产制造', icon: '🏭' },
  { path: '/admin/inventory', label: '仓储物流', icon: '🚚' },
  { path: '/admin/dealers', label: '经销商管理', icon: '🏢' },
  { path: '/admin/customers', label: '客户车主', icon: '👤' },
  { path: '/admin/after-sales', label: '售后服务', icon: '🛠️' },
  { path: '/admin/supply', label: '供应链采购', icon: '📦' },
  { path: '/admin/finance', label: '财务结算', icon: '💳' },
  { path: '/admin/analytics', label: '数据分析', icon: '📈' },
  { path: '/admin/settings', label: '系统设置', icon: '⚙️' },
  { path: '/admin', label: '工作台', icon: '🏠' },
  { path: '/product', label: '产品中心', icon: '📦' },
  { path: '/production', label: '生产制造', icon: '🏭' },
  { path: '/inventory', label: '仓储物流', icon: '🚚' },
  { path: '/dealers', label: '经销商管理', icon: '🏢' },
  { path: '/customers', label: '客户车主', icon: '👤' },
  { path: '/after-sales', label: '售后服务', icon: '🛠️' },
  { path: '/supply', label: '供应链采购', icon: '📦' },
  { path: '/finance', label: '财务结算', icon: '💳' },
  { path: '/logistics', label: '仓储物流', icon: '🚚' },
  { path: '/commerce', label: '电商工作台', icon: '🛒' },
  { path: '/portal-launcher', label: '工作入口', icon: '🧭' },
];

type WorkspaceNavigation = {
  location: string;
  navigate(path: string): void;
  close(path: string): void;
};
const WorkspaceNavigationContext = createContext<WorkspaceNavigation | null>(null);

/** Optional: only authenticated Admin supplies soft navigation and draft eviction. */
export function WorkspaceNavigationProvider({
  children, location, navigate, close,
}: PropsWithChildren<WorkspaceNavigation>) {
  return <WorkspaceNavigationContext.Provider value={{ location, navigate, close }}>
    {children}
  </WorkspaceNavigationContext.Provider>;
}

const WORKSPACE_TAB_STORAGE_KEY = 'alsvid_workspace_tabs_v1';
const WORKSPACE_TAB_LIMIT = 8;

function workspaceUrl(path: string): URL {
  return new URL(path, 'https://alsvid.invalid');
}

function isAllowedWorkspacePath(path: unknown): path is string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false;
  try {
    const pathname = workspaceUrl(path).pathname;
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) return false;
    return ['/admin', '/product', '/production', '/inventory', '/dealers', '/customers', '/after-sales', '/supply', '/finance', '/logistics', '/commerce', '/portal-launcher']
      .some((root) => pathname === root || pathname.startsWith(root + '/'));
  } catch {
    return false;
  }
}

function workspaceTabFor(path: string): WorkspaceTab {
  const url = workspaceUrl(path);
  const selectedLabel = url.searchParams.get('alsvidMenuLabel')?.slice(0, 80);
  const route = [...WORKSPACE_TAB_ROUTES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => url.pathname === item.path || url.pathname.startsWith(item.path + '/'));
  const tabPath = url.pathname + url.search + url.hash;
  if (selectedLabel) return { path: tabPath, label: selectedLabel, icon: route?.icon ?? '📄' };
  if (route) return { path: tabPath, label: route.label, icon: route.icon };
  const tail = url.pathname.split('/').filter(Boolean).pop() ?? '工作区';
  return { path: tabPath, label: tail.replace(/[-_]/g, ' '), icon: '📄' };
}

function readWorkspaceTabs(): WorkspaceTab[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(WORKSPACE_TAB_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, WorkspaceTab>();
    for (const item of parsed) {
      if (item && typeof item === 'object' && 'path' in item && isAllowedWorkspacePath(item.path)) {
        unique.set(item.path, workspaceTabFor(item.path));
      }
    }
    return Array.from(unique.values()).slice(-WORKSPACE_TAB_LIMIT);
  } catch {
    return [];
  }
}

export function WorkspaceTabs() {
  const workspace = useContext(WorkspaceNavigationContext);
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activePath, setActivePath] = useState('');

  useEffect(() => {
    const syncCurrentTab = () => {
      const path = (workspace?.location ??
        window.location.pathname + window.location.search) + window.location.hash;
      if (!isAllowedWorkspacePath(path)) return;
      const next = readWorkspaceTabs();
      const current = workspaceTabFor(path);
      const existing = next.findIndex((tab) => tab.path === path);
      if (existing >= 0) next[existing] = current;
      else next.push(current);
      const limited = next.slice(-WORKSPACE_TAB_LIMIT);
      setTabs(limited);
      setActivePath(path);
      try {
        window.sessionStorage.setItem(WORKSPACE_TAB_STORAGE_KEY, JSON.stringify(limited));
      } catch {
        // The shell remains usable if session storage is unavailable.
      }
    };
    syncCurrentTab();
    window.addEventListener('pageshow', syncCurrentTab);
    window.addEventListener('popstate', syncCurrentTab);
    window.addEventListener('hashchange', syncCurrentTab);
    return () => {
      window.removeEventListener('pageshow', syncCurrentTab);
      window.removeEventListener('popstate', syncCurrentTab);
      window.removeEventListener('hashchange', syncCurrentTab);
    };
  }, [workspace?.location]);

  function toggleRail() {
    document.querySelector('.shellFrame')?.classList.toggle('shellFrameRailCollapsed');
    document.querySelector('.av-body')?.classList.toggle('av-body--rail-collapsed');
  }

  function closeTab(path: string) {
    const index = tabs.findIndex((tab) => tab.path === path);
    const remaining = tabs.filter((tab) => tab.path !== path);
    setTabs(remaining);
    try {
      window.sessionStorage.setItem(WORKSPACE_TAB_STORAGE_KEY, JSON.stringify(remaining));
    } catch {
      // The tab bar still works for this page if storage is unavailable.
    }
    workspace?.close(path);
    if (path === activePath) {
      const fallback = tabs[index - 1] ?? tabs[index + 1];
      const destination = fallback?.path ?? '/admin';
      if (workspace && destination !== path) workspace.navigate(destination);
      else window.location.assign(destination);
    }
  }

  return (
    <nav className="workspaceTabs" aria-label="工作区标签页">
      <button className="workspaceTabsToggle" type="button" aria-label="折叠或展开左侧菜单" title="折叠或展开左侧菜单" onClick={toggleRail}>☰</button>
      <div className="workspaceTabsList">
        {tabs.map((tab) => (
          <div className="workspaceTab" key={tab.path} data-active={activePath === tab.path}>
            <a className="workspaceTabLink" href={tab.path} aria-current={activePath === tab.path ? 'page' : undefined}>
              <span className="workspaceTabIcon" aria-hidden="true">{tab.icon}</span>
              <span className="workspaceTabLabel">{tab.label}</span>
            </a>
            <button className="workspaceTabClose" type="button" aria-label={'关闭' + tab.label} title={'关闭' + tab.label} onClick={() => closeTab(tab.path)}>×</button>
          </div>
        ))}
      </div>
    </nav>
  );
}

export type AdminSecondaryNavigationItem = {
  key: string;
  label: string;
  href?: string;
  icon: string;
  nested?: boolean;
  status?: string;
  disabled?: boolean;
};

export type AdminSecondaryNavigationGroup = {
  label: string;
  items: readonly AdminSecondaryNavigationItem[];
};

function secondaryNavigationHref(href: string, key: string, label: string): string {
  const url = workspaceUrl(href);
  url.searchParams.set('alsvidMenu', key);
  url.searchParams.set('alsvidMenuLabel', label);
  return url.pathname + url.search + url.hash;
}

/** EC-FX-style module sidebar: module title, grouped links, active item and planned badges. */
export function AdminSecondaryNavigation({
  moduleLabel,
  groups,
}: {
  moduleLabel: string;
  groups: readonly AdminSecondaryNavigationGroup[];
}) {
  const [activeKey, setActiveKey] = useState('');

  useEffect(() => {
    const syncActiveItem = () => {
      const current = new URL(window.location.href);
      const items = groups.flatMap((group) => group.items);
      const requestedKey = current.searchParams.get('alsvidMenu');
      const requested = requestedKey ? items.find((item) => item.key === requestedKey) : undefined;
      if (requested) {
        setActiveKey(requested.key);
        return;
      }
      const enabled = items.filter((item) => item.href && !item.disabled);
      const currentPath = current.pathname + current.hash;
      const exact = enabled.find((item) => {
        const target = new URL(item.href!, window.location.origin);
        return target.pathname + target.hash === currentPath;
      });
      const samePage = exact ?? enabled
        .filter((item) => {
          const targetPath = new URL(item.href!, window.location.origin).pathname.replace(/\/$/, '');
          return current.pathname === targetPath || current.pathname.startsWith(targetPath + '/');
        })
        .sort((left, right) =>
          new URL(right.href!, window.location.origin).pathname.length -
          new URL(left.href!, window.location.origin).pathname.length
        )[0];
      setActiveKey(samePage?.key ?? '');
    };

    syncActiveItem();
    window.addEventListener('pageshow', syncActiveItem);
    window.addEventListener('popstate', syncActiveItem);
    window.addEventListener('hashchange', syncActiveItem);
    return () => {
      window.removeEventListener('pageshow', syncActiveItem);
      window.removeEventListener('popstate', syncActiveItem);
      window.removeEventListener('hashchange', syncActiveItem);
    };
  }, [groups]);

  return (
    <aside className="av-rail av-rail--ecfx" aria-label="二级导航">
      <div className="av-railbrand">
        <strong>{moduleLabel}</strong>
      </div>
      <nav className="av-railnav" aria-label={moduleLabel + '二级导航'}>
        {groups.map((group) => (
          <div className="av-railgroup" key={group.label}>
            {group.items.map((item) => {
              const active = activeKey === item.key;
              const unavailable = item.disabled || !item.href;
              const content = (
                <>
                  <span className="av-railicon" aria-hidden="true">{item.icon}</span>
                  <span className="av-raillabel">{item.label}</span>
                  {item.status ? <span className={'av-railbadge' + (unavailable ? ' av-railbadge--planned' : '')}>{item.status}</span> : null}
                </>
              );
              return unavailable ? (
                <span className="av-railitem av-railitem--disabled" key={item.key} aria-disabled="true" title={item.status ?? '该功能尚未开放'}>
                  {content}
                </span>
              ) : (
                <a
                  className={'av-railitem' + (item.nested ? ' av-railitem--nested' : '')}
                  key={item.key}
                  href={secondaryNavigationHref(item.href!, item.key, item.label)}
                  data-active={active}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                >
                  {content}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function AppShell({
  children,
  navigation,
  brand = 'ALSVID',
  brandHref = '/admin',
  footer = 'ALSVID V1',
  workspaceId,
  classNames = {},
}: PropsWithChildren<{
  navigation: readonly AppNavItem[];
  brand?: ReactNode;
  brandHref?: string;
  footer?: ReactNode;
  workspaceId?: string;
  classNames?: AppShellClassNames;
}>) {
  const [location, setLocation] = useState<string>();
  useEffect(() => {
    const updateLocation = () => setLocation(window.location.href);
    updateLocation();
    window.addEventListener('hashchange', updateLocation);
    window.addEventListener('popstate', updateLocation);
    return () => {
      window.removeEventListener('hashchange', updateLocation);
      window.removeEventListener('popstate', updateLocation);
    };
  }, [navigation]);
  const { activeArea, contextualNavigation, areas: resolvedAreas } = resolveNavigation(navigation, location);
  const showContextRail = activeArea !== '工作台' && contextualNavigation.length > 0;
  const areas = resolvedAreas.map((area) => ({ ...area, description: areaDescriptions[area.label] ?? `${area.label}模块` }));

  return (
    <main className={`shellV2 ${classNames.shell ?? ''}`.trim()} data-alsvid-app-shell="true">
      <header className="primaryHeader">
        <a className={`primaryBrand ${classNames.brand ?? ''}`.trim()} href={brandHref}>{brand}</a>
        <nav className="primaryNavigation" aria-label="一级导航">
          {areas.map((area) => area.disabled ? (
            <span className="primaryNavItem primaryNavItemDisabled" key={area.label} aria-disabled="true" title={area.description}><span className="primaryNavIcon" aria-hidden="true">{areaIcons[area.label] ?? '▦'}</span><span>{area.label}</span></span>
          ) : (
            <a className={`primaryNavItem${area.active ? ' primaryNavItemActive' : ''}`} href={area.href} key={area.label} aria-current={area.active ? 'page' : undefined} title={area.description}><span className="primaryNavIcon" aria-hidden="true">{areaIcons[area.label] ?? '▦'}</span><span>{area.label}</span></a>
          ))}
        </nav>
        <div className="primaryUtilities" aria-label="快捷工具">
          <button className="utilityButton" type="button" aria-label="搜索（待接入）" title="搜索（待接入）" disabled>⌕</button>
          <ThemeToggle />
          <button className="utilityButton utilityNotify" type="button" aria-label="通知（待接入）" title="通知（待接入）" disabled>♢</button>
          <a className="primaryProfile" href="/portal-launcher" aria-label="工作入口">
            <span className="profileAvatar">A</span>
            <span className="profileCopy"><strong>管理员</strong><small>ALSVID</small></span>
            <span aria-hidden="true">⌄</span>
          </a>
        </div>
      </header>

      <details className="mobileNav mobileNavV2">
        <summary><strong>{brand}</strong><span>{activeArea} · 菜单</span></summary>
        <div className="mobilePrimaryNavigation" aria-label="一级导航">
          {areas.map((area) => area.disabled ? (
            <span className="mobilePrimaryItem mobilePrimaryItemDisabled" key={area.label}><span className="primaryNavIcon" aria-hidden="true">{areaIcons[area.label] ?? '▦'}</span><span>{area.label}</span></span>
          ) : (
            <a className={`mobilePrimaryItem${area.active ? ' mobilePrimaryItemActive' : ''}`} href={area.href} key={area.label} title={area.description}><span className="primaryNavIcon" aria-hidden="true">{areaIcons[area.label] ?? '▦'}</span><span>{area.label}</span></a>
          ))}
        </div>
        {contextualNavigation.length > 0 ? (
          <nav className="mobileNavPanel" aria-label={`${activeArea} 二级导航`}><NavigationItems navigation={contextualNavigation} activeClassName={classNames.active} /></nav>
        ) : null}
        <div className={classNames.footer ?? 'railFoot'}>{footer}</div>
      </details>

      <div className={`shellFrame${showContextRail ? ' shellFrameWithRail' : ''}`}>
        {showContextRail ? (
          <aside className={`contextRail ${classNames.rail ?? ''}`.trim()} aria-label={`${activeArea} 模块菜单`}>
            <div className="contextRailSticky">
              <div className="contextRailTitle">
                <strong>{activeArea}</strong>
              </div>
              <nav className={`contextRailNav ${classNames.nav ?? ''}`.trim()} aria-label={`${activeArea} 二级导航`}>
                <NavigationItems navigation={contextualNavigation} activeClassName={classNames.active} />
              </nav>
              <div className={classNames.footer ?? 'railFoot'}>{footer}</div>
            </div>
          </aside>
        ) : null}
        <div className="adminBody">
          <WorkspaceTabs />
          <section className={`workspace ${classNames.workspace ?? ''}`.trim()} id={workspaceId} data-alsvid-workspace="true">{children}</section>
        </div>
      </div>
    </main>
  );
}

export function Surface({ children }: PropsWithChildren) {
  return <section data-alsvid-surface="true">{children}</section>;
}

export function SectionTitle({ eyebrow, children }: PropsWithChildren<{ eyebrow?: ReactNode }>) {
  return (
    <header>
      {eyebrow ? <div>{eyebrow}</div> : null}
      <h2>{children}</h2>
    </header>
  );
}

export function Notice({ children, role = 'status' }: PropsWithChildren<{ role?: 'status' | 'alert' }>) {
  return <div role={role} data-alsvid-notice="true">{children}</div>;
}

export function EmptyState({ children }: PropsWithChildren) {
  return <div data-alsvid-empty-state="true">{children}</div>;
}
