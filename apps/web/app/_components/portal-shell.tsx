import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@alsvid/ui';
import styles from './portal-shell.module.css';

export type PortalKind = 'admin' | 'dealer' | 'my';
type PortalLink = { label: string; href?: string; status?: string };
type PrimaryLink = { label: string; href?: string; status?: string };

const primaryNavigation: PrimaryLink[] = [
  { label: '首页', href: '/admin' },
  { label: '产品中心', href: '/product' },
  { label: 'Vehicle 360', href: '/vehicle360' },
  { label: '订单管理', href: '/commerce' },
  { label: '经销商', href: '/dealers' },
  { label: '售后服务', status: '规划中' },
  { label: '配件 BOM', href: '/product#engineering' },
  { label: '客户中心', status: '规划中' },
  { label: '系统设置', href: '/settings/environment' },
];

const portalConfig: Record<PortalKind, { name: string; subtitle: string; links: PortalLink[] }> = {
  admin: { name: 'ALSVID Admin', subtitle: '产品中心', links: [
    { label: '产品系列', href: '/product#series' }, { label: '产品型号', href: '/product#models' }, { label: '配置管理', href: '/product#configuration' }, { label: 'BOM 结构', href: '/product#engineering' }, { label: '图片 / 视频素材', status: '规划中' }, { label: '技术资料', status: '规划中' }, { label: '供应商管理', href: '/partners' },
  ] },
  dealer: { name: 'Dealer Portal', subtitle: '经销商门户', links: [
    { label: '工作台', href: '/dealer' }, { label: '我的公司', status: '待开发' }, { label: '订单与物流', status: '待开发' }, { label: '车辆交付', status: '待开发' }, { label: '售后服务', status: '待开发' },
  ] },
  my: { name: 'My ALSVID', subtitle: '车主服务', links: [
    { label: '我的车辆', href: '/my' }, { label: '车辆档案', status: '待开发' }, { label: '保修与服务', status: '待开发' }, { label: '说明书与配件', status: '待开发' }, { label: '账户与偏好', status: '待开发' },
  ] },
};

export function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const config = portalConfig[kind];
  return (
    <div className={styles.portal} data-portal={kind}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/portal-launcher">ALSVID</Link>
        <nav className={styles.primaryNavigation} aria-label="主导航">
          {primaryNavigation.map((item) => item.href ? <Link key={item.label} href={item.href} className={styles.primaryNavItem}>{item.label}</Link> : <span key={item.label} className={`${styles.primaryNavItem} ${styles.primaryNavDisabled}`} aria-disabled="true">{item.label}</span>)}
        </nav>
        <div className={styles.headerTools}><ThemeToggle /><Link className={styles.launcherLink} href="/portal-launcher">Portal ↗</Link></div>
      </header>
      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label={config.subtitle + '导航'}>
          <div className={styles.sidebarLabel}>{config.subtitle}</div>
          <nav>{config.links.map((item) => item.href ? <Link className={styles.navLink} href={item.href} key={`${item.label}-${item.href}`}><span>{item.label}</span>{item.status ? <small>{item.status}</small> : null}</Link> : <span className={`${styles.navLink} ${styles.navLinkDisabled}`} aria-disabled="true" key={item.label}><span>{item.label}</span>{item.status ? <small>{item.status}</small> : null}</span>)}</nav>
        </aside>
        <main className={styles.main}><div className={styles.portalTitle}><span>{config.name}</span><small>{config.subtitle}</small></div>{children}</main>
      </div>
    </div>
  );
}
