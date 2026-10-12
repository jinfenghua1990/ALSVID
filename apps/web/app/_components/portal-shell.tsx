import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@alsvid/ui';
import styles from './portal-shell.module.css';

export type PortalKind = 'admin' | 'dealer' | 'my';

type PortalLink = { label: string; href: string; status?: string; disabled?: boolean };

const primaryNavigation: readonly PortalLink[] = [
  { label: '首页', href: '/admin' },
  { label: '产品中心', href: '/product' },
  { label: 'Vehicle 360', href: '/vehicle360' },
  { label: '订单管理', href: '/commerce' },
  { label: '经销商', href: '/dealers' },
  { label: '配件 BOM', href: '/product#engineering' },
  { label: '售后服务', href: '/after-sales' },
  { label: '客户中心', href: '/customers' },
];

const portalConfig: Record<PortalKind, { name: string; subtitle: string; links: PortalLink[] }> = {
  admin: {
    name: 'ALSVID 内部管理',
    subtitle: '产品中心',
    links: [
      { label: '产品系列', href: '/product#series' },
      { label: '车型 / Variant / SKU', href: '/product#models' },
      { label: '配置管理', href: '/product#configuration' },
      { label: 'BOM 结构', href: '/product#engineering' },
      { label: '外观与颜色', href: '/product/appearance' },
      { label: '图片 / 视频素材', href: '/product/media' },
      { label: '技术资料', href: '/product/documents' },
      { label: '供应商关联', href: '/product/suppliers' },
    ],
  },
  dealer: {
    name: 'ALSVID 经销商门户',
    subtitle: '经销商门户',
    links: [
      { label: '工作台', href: '/dealer' },
      { label: '我的公司', href: '/dealer/company' },
      { label: '订单与物流', href: '/dealer/orders' },
      { label: '车辆交付', href: '/dealer/vehicles' },
      { label: '售后服务', href: '/dealer/service' },
    ],
  },
  my: {
    name: '我的 ALSVID',
    subtitle: '车主服务',
    links: [
      { label: '我的车辆', href: '/my' },
      { label: '车辆档案', href: '/my/vehicles' },
      { label: '保修与服务', href: '/my/service' },
      { label: '说明书与配件', href: '/my/library' },
      { label: '账户与偏好', href: '/my/account' },
    ],
  },
};

function NavEntry({ item, primary = false, active = false }: { item: PortalLink; primary?: boolean; active?: boolean }) {
  const baseClass = primary ? styles.primaryNavItem : styles.navLink;
  const disabledClass = primary ? styles.primaryNavDisabled : styles.navDisabled;
  const activeClass = primary ? styles.primaryNavActive : styles.navActive;

  if (item.disabled) {
    return (
      <span className={`${baseClass} ${disabledClass}`} aria-disabled="true">
        <span>{item.label}</span>
        {!primary && item.status ? <small>{item.status}</small> : null}
      </span>
    );
  }

  return (
    <Link className={`${baseClass}${active ? ` ${activeClass}` : ''}`} href={item.href} aria-current={active ? 'page' : undefined}>
      <span>{item.label}</span>
      {!primary && item.status ? <small>{item.status}</small> : null}
    </Link>
  );
}

function defaultActiveHref(kind: PortalKind) {
  if (kind === 'dealer') return '/dealer';
  if (kind === 'my') return '/my';
  return '/product';
}

function isPrimaryActive(href: string, currentHref: string) {
  if (href.includes('#')) return currentHref.startsWith('/product');
  if (href === '/product') return currentHref.startsWith('/product');
  if (href === '/vehicle360') return currentHref.startsWith('/vehicle360') || currentHref === '/production';
  if (href === '/commerce') return ['/commerce', '/supply', '/inventory', '/logistics', '/finance'].some((prefix) => currentHref.startsWith(prefix));
  if (href === '/dealers') return currentHref.startsWith('/dealers') || currentHref.startsWith('/partners');
  if (href === '/after-sales') return currentHref.startsWith('/after-sales');
  if (href === '/customers') return currentHref.startsWith('/customers') || currentHref.startsWith('/my');
  return href === currentHref;
}

export function PortalShell({ kind, activeHref, children }: { kind: PortalKind; activeHref?: string; children: ReactNode }) {
  const config = portalConfig[kind];
  const currentHref = activeHref ?? defaultActiveHref(kind);

  return (
    <div className={styles.portal} data-portal={kind}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/admin">ALSVID</Link>
        <nav className={styles.primaryNavigation} aria-label="主导航">
          {primaryNavigation.map((item) => <NavEntry item={item} primary active={isPrimaryActive(item.href, currentHref)} key={item.label} />)}
        </nav>
        <div className={styles.headerTools}>
          <ThemeToggle />
          <Link className={styles.launcherLink} href="/admin">管理首页 ↗</Link>
        </div>
      </header>

      <div className={styles.secondaryNav}>
        <div className={styles.secondaryNavInner}>
          <strong>{config.subtitle}</strong>
          <nav aria-label={`${config.subtitle}导航`}>
            {config.links.map((item) => <NavEntry item={item} active={item.href === currentHref} key={`${item.label}-${item.href}`} />)}
          </nav>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.portalTitle}><span>{config.name}</span><small>{config.subtitle}</small></div>
        {children}
      </main>
    </div>
  );
}
