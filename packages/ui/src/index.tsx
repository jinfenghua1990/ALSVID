'use client';

import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
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
            <span className="primaryNavItem primaryNavItemDisabled" key={area.label} aria-disabled="true" title={area.description}>{area.label}</span>
          ) : (
            <a className={`primaryNavItem${area.active ? ' primaryNavItemActive' : ''}`} href={area.href} key={area.label} aria-current={area.active ? 'page' : undefined} title={area.description}>{area.label}</a>
          ))}
        </nav>
        <div className="primaryUtilities" aria-label="快捷工具">
          <ThemeToggle />
          <a className="primaryProfile" href="/portal-launcher" aria-label="切换 ALSVID 工作入口" title="切换 ALSVID 工作入口">
            <span className="profileAvatar">A</span>
            <span className="profileCopy"><strong>ALSVID Admin</strong><small>工作入口</small></span>
            <span aria-hidden="true">⌄</span>
          </a>
        </div>
      </header>

      <details className="mobileNav mobileNavV2">
        <summary><strong>{brand}</strong><span>{activeArea} · 菜单</span></summary>
        <div className="mobilePrimaryNavigation" aria-label="一级导航">
          {areas.map((area) => area.disabled ? (
            <span className="mobilePrimaryItem mobilePrimaryItemDisabled" key={area.label}>{area.label}</span>
          ) : (
            <a className={`mobilePrimaryItem${area.active ? ' mobilePrimaryItemActive' : ''}`} href={area.href} key={area.label} title={area.description}>{area.label}</a>
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
                <span>模块导航</span>
              </div>
              <nav className={`contextRailNav ${classNames.nav ?? ''}`.trim()} aria-label={`${activeArea} 二级导航`}>
                <NavigationItems navigation={contextualNavigation} activeClassName={classNames.active} />
              </nav>
              <div className={classNames.footer ?? 'railFoot'}>{footer}</div>
            </div>
          </aside>
        ) : null}
        <div className="adminBody">
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
