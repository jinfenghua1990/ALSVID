import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './portal-shell.module.css';

export type PortalKind = 'admin' | 'dealer' | 'my';

type PortalLink = { label: string; href: string; status?: string; disabled?: boolean };

// Only destinations that exist in this application are rendered as links.
// Planned areas stay visible as labelled, non-clickable entries instead of
// presenting dead links that end in a 404.
const primaryNavigation: readonly PortalLink[] = [
  { label: '首页', href: '/admin' },
  { label: '产品中心', href: '/product' },
  { label: 'Vehicle 360', href: '/vehicle360' },
  { label: '订单管理', href: '/commerce' },
  { label: '经销商', href: '/dealers' },
  { label: '配件 BOM', href: '/product#engineering' },
  { label: '售后服务', href: '#', status: '规划中', disabled: true },
  { label: '客户中心', href: '#', status: '规划中', disabled: true },
];

const portalConfig: Record<PortalKind, { name: string; subtitle: string; links: PortalLink[] }> = {
  admin: {
    name: 'ALSVID Admin',
    subtitle: '产品中心',
    links: [
      { label: '产品系列', href: '/product' },
      { label: '车型 / Variant / SKU', href: '/product#models' },
      { label: '配置管理', href: '/product#configuration' },
      { label: 'BOM 结构', href: '/product#engineering' },
      { label: '图片 / 视频素材', href: '#', status: '规划中', disabled: true },
      { label: '技术资料', href: '#', status: '规划中', disabled: true },
      { label: '供应商管理', href: '#', status: '预留', disabled: true },
    ],
  },
  dealer: {
    name: 'Dealer Portal',
    subtitle: '经销商门户',
    links: [
      { label: '工作台', href: '/dealer' },
      { label: '订单与物流', href: '#', status: '待开发', disabled: true },
      { label: '车辆交付', href: '#', status: '待开发', disabled: true },
      { label: '售后服务', href: '#', status: '待开发', disabled: true },
    ],
  },
  my: {
    name: 'My ALSVID',
    subtitle: '车主服务',
    links: [
      { label: '我的车辆', href: '/my' },
      { label: '车辆档案', href: '#', status: '待开发', disabled: true },
      { label: '服务记录', href: '#', status: '待开发', disabled: true },
    ],
  },
};

function NavEntry({ item, className }: { item: PortalLink; className: string | undefined }) {
  if (item.disabled) {
    return (
      <span className={className} aria-disabled="true">
        <span>{item.label}</span>
        {item.status ? <small>{item.status}</small> : null}
      </span>
    );
  }
  return (
    <Link className={className} href={item.href}>
      <span>{item.label}</span>
      {item.status ? <small>{item.status}</small> : null}
    </Link>
  );
}

export function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const config = portalConfig[kind];

  return (
    <div className={styles.portal} data-portal={kind}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/portal-launcher">ALSVID</Link>
        <nav className={styles.primaryNavigation} aria-label="主导航">
          {primaryNavigation.map((item) => (
            <NavEntry item={item} className={styles.primaryNavItem} key={item.label} />
          ))}
        </nav>
        <Link className={styles.launcherLink} href="/portal-launcher">Portal ↗</Link>
      </header>

      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label={config.subtitle + '导航'}>
          <div className={styles.sidebarLabel}>{config.subtitle}</div>
          <nav>
            {config.links.map((item) => (
              <NavEntry item={item} className={styles.navLink} key={item.label} />
            ))}
          </nav>
          {kind !== 'admin' ? <p className={styles.scopeNote}>页面仅为体验骨架。登录身份、组织/车主关系和服务端数据权限接入后，才会显示真实业务记录。</p> : null}
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}