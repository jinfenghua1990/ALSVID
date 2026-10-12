import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './portal-shell.module.css';

export type PortalKind = 'admin' | 'dealer' | 'my';

type PortalLink = { label: string; href: string; status?: string };

const primaryNavigation = [
  { label: '首页', href: '/admin' },
  { label: '产品中心', href: '/product' },
  { label: 'Vehicle 360', href: '/vehicles' },
  { label: '订单管理', href: '/orders' },
  { label: '经销商', href: '/dealers' },
  { label: '售后服务', href: '/service' },
  { label: '配件 BOM', href: '/bom' },
  { label: '客户中心', href: '/customers' },
];

const portalConfig: Record<PortalKind, { name: string; subtitle: string; links: PortalLink[] }> = {
  admin: {
    name: 'ALSVID Admin',
    subtitle: '产品中心',
    links: [
      { label: '产品系列', href: '/product' },
      { label: '产品型号', href: '/product/models' },
      { label: '配置管理', href: '/product/configuration' },
      { label: 'BOM结构', href: '/bom' },
      { label: '图片 / 视频素材', href: '/product/media' },
      { label: '技术资料', href: '/product/documents' },
      { label: '供应商管理', href: '/suppliers' },
    ],
  },
  dealer: {
    name: 'Dealer Portal',
    subtitle: '经销商门户',
    links: [
      { label: '工作台', href: '/dealer' },
      { label: '订单与物流', href: '/dealer/orders', status: '待开发' },
      { label: '车辆交付', href: '/dealer/vehicles', status: '待开发' },
      { label: '售后服务', href: '/dealer/service', status: '待开发' },
    ],
  },
  my: {
    name: 'My ALSVID',
    subtitle: '车主服务',
    links: [
      { label: '我的车辆', href: '/my' },
      { label: '车辆档案', href: '/my/vehicles', status: '待开发' },
      { label: '服务记录', href: '/my/service', status: '待开发' },
    ],
  },
};

export function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const config = portalConfig[kind];

  return (
    <div className={styles.portal} data-portal={kind}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/portal-launcher">ALSVID</Link>
        <nav className={styles.primaryNavigation} aria-label="主导航">
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href} className={styles.primaryNavItem}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className={styles.launcherLink} href="/portal-launcher">Portal ↗</Link>
      </header>

      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label={config.subtitle + '导航'}>
          <div className={styles.sidebarLabel}>{config.subtitle}</div>
          <nav>
            {config.links.map((item) => (
              <Link className={styles.navLink} href={item.href} key={item.href}>
                <span>{item.label}</span>
                {item.status ? <small>{item.status}</small> : null}
              </Link>
            ))}
          </nav>
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
