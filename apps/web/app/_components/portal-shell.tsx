import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@alsvid/ui';
import styles from './portal-shell.module.css';

export type PortalKind = 'admin' | 'dealer' | 'supplier' | 'my';

type PortalLink = { label: string; href: string; status?: string; disabled?: boolean };

type PortalConfig = {
  name: string;
  subtitle: string;
  brandHref: string;
  launcher: PortalLink;
  primaryLinks: PortalLink[];
  secondaryLinks: PortalLink[];
};

const adminPrimaryNavigation: readonly PortalLink[] = [
  { label: '首页', href: '/admin' },
  { label: '产品中心', href: '/product' },
  { label: 'Vehicle 360', href: '/vehicle360' },
  { label: '订单管理', href: '/commerce' },
  { label: '经销商', href: '/dealers' },
  { label: '配件 BOM', href: '/product#engineering' },
  { label: '售后服务', href: '/after-sales' },
  { label: '客户中心', href: '/customers' },
];

const portalConfig: Record<PortalKind, PortalConfig> = {
  admin: {
    name: 'ALSVID 内部管理',
    subtitle: '产品中心',
    brandHref: '/admin',
    launcher: { label: '管理首页 ↗', href: '/admin' },
    primaryLinks: [...adminPrimaryNavigation],
    secondaryLinks: [
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
    subtitle: '经销商业务',
    brandHref: '/dealer',
    launcher: { label: '经销商账户 ↗', href: '/dealer/account' },
    primaryLinks: [
      { label: '工作台', href: '/dealer' },
      { label: '产品目录', href: '/dealer/catalog' },
      { label: '采购', href: '/dealer/purchase' },
      { label: 'B2B 订单', href: '/dealer/orders' },
      { label: '交付车辆', href: '/dealer/vehicles' },
    ],
    secondaryLinks: [
      { label: '订单状态', href: '/dealer/order-status' },
      { label: '库存 / 可供货', href: '/dealer/availability' },
      { label: '售后申请', href: '/dealer/service' },
      { label: '配件申请', href: '/dealer/parts' },
      { label: '文件资料', href: '/dealer/documents' },
      { label: '经销商账户', href: '/dealer/account' },
    ],
  },
  supplier: {
    name: 'ALSVID 供应商门户',subtitle: '上游采购协同',brandHref: '/supplier',
    launcher: {label: '供应商采购单 ↗',href:'/supplier'},
    primaryLinks: [{label:'采购单',href:'/supplier'}],secondaryLinks: [],
  },
  my: {
    name: '我的 ALSVID',
    subtitle: '车主服务',
    brandHref: '/my',
    launcher: { label: '我的账户 ↗', href: '/my/account' },
    primaryLinks: [
      { label: '首页', href: '/my' },
      { label: '我的车辆', href: '/my/vehicles' },
      { label: '服务', href: '/my/service' },
      { label: '我的账户', href: '/my/account' },
    ],
    secondaryLinks: [],
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
  if (kind === 'supplier') return '/supplier';
  if (kind === 'my') return '/my';
  return '/product';
}

function isAdminPrimaryActive(href: string, currentHref: string) {
  if (href.includes('#')) return currentHref.startsWith('/product');
  if (href === '/product') return currentHref.startsWith('/product');
  if (href === '/vehicle360') return currentHref.startsWith('/vehicle360') || currentHref === '/production';
  if (href === '/commerce') return ['/commerce', '/supply', '/inventory', '/logistics', '/finance'].some((prefix) => currentHref.startsWith(prefix));
  if (href === '/dealers') return currentHref.startsWith('/dealers') || currentHref.startsWith('/partners');
  if (href === '/after-sales') return currentHref.startsWith('/after-sales');
  if (href === '/customers') return currentHref.startsWith('/customers');
  return href === currentHref;
}

function isPortalLinkActive(kind: PortalKind, href: string, currentHref: string) {
  if (kind === 'admin') return isAdminPrimaryActive(href, currentHref);
  if (href === '/dealer' || href === '/supplier' || href === '/my') return href === currentHref;
  return currentHref === href || currentHref.startsWith(`${href}/`);
}

export function PortalShell({ kind, activeHref, children }: { kind: PortalKind; activeHref?: string; children: ReactNode }) {
  const config = portalConfig[kind];
  const currentHref = activeHref ?? defaultActiveHref(kind);

  return (
    <div className={styles.portal} data-portal={kind}>
      <header className={styles.header}>
        <Link className={styles.brand} href={config.brandHref}>ALSVID</Link>
        <nav className={styles.primaryNavigation} aria-label={`${config.name}主导航`}>
          {config.primaryLinks.map((item) => (
            <NavEntry item={item} primary active={isPortalLinkActive(kind, item.href, currentHref)} key={`${kind}-${item.label}`} />
          ))}
        </nav>
        <div className={styles.headerTools}>
          <ThemeToggle />
          <Link className={styles.launcherLink} href={config.launcher.href}>{config.launcher.label}</Link>
        </div>
      </header>

      {config.secondaryLinks.length > 0 ? (
        <div className={styles.secondaryNav}>
          <div className={styles.secondaryNavInner}>
            <strong>{config.subtitle}</strong>
            <nav aria-label={`${config.subtitle}导航`}>
              {config.secondaryLinks.map((item) => (
                <NavEntry item={item} active={isPortalLinkActive(kind, item.href, currentHref)} key={`${item.label}-${item.href}`} />
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      <main className={styles.main}>
        <div className={styles.portalTitle}><span>{config.name}</span><small>{config.subtitle}</small></div>
        {children}
      </main>
    </div>
  );
}
