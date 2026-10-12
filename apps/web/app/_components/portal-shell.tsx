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
  { label: '售后服务', href: '#', status: '规划中', disabled: true },
  { label: '客户中心', href: '#', status: '规划中', disabled: true },
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
      { label: '图片 / 视频素材', href: '#', status: '规划中', disabled: true },
      { label: '技术资料', href: '#', status: '规划中', disabled: true },
      { label: '供应商管理', href: '/partners' },
    ],
  },
  dealer: {
    name: 'ALSVID 经销商门户',
    subtitle: '经销商门户',
    links: [
      { label: '工作台', href: '/dealer' },
      { label: '我的公司', href: '#', status: '待开发', disabled: true },
      { label: '订单与物流', href: '#', status: '待开发', disabled: true },
      { label: '车辆交付', href: '#', status: '待开发', disabled: true },
      { label: '售后服务', href: '#', status: '待开发', disabled: true },
    ],
  },
  my: {
    name: '我的 ALSVID',
    subtitle: '车主服务',
    links: [
      { label: '我的车辆', href: '/my' },
      { label: '车辆档案', href: '#', status: '待开发', disabled: true },
      { label: '保修与服务', href: '#', status: '待开发', disabled: true },
      { label: '说明书与配件', href: '#', status: '待开发', disabled: true },
      { label: '账户与偏好', href: '#', status: '待开发', disabled: true },
    ],
  },
};

function NavEntry({ item, primary = false }: { item: PortalLink; primary?: boolean }) {
  const baseClass = primary ? styles.primaryNavItem : styles.navLink;
  const disabledClass = primary ? styles.primaryNavDisabled : styles.navDisabled;

  if (item.disabled) {
    return (
      <span className={`${baseClass} ${disabledClass}`} aria-disabled="true">
        <span>{item.label}</span>
        {!primary && item.status ? <small>{item.status}</small> : null}
      </span>
    );
  }

  return (
    <Link className={baseClass} href={item.href}>
      <span>{item.label}</span>
      {!primary && item.status ? <small>{item.status}</small> : null}
    </Link>
  );
}

export function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const config = portalConfig[kind];

  return (
    <div className={styles.portal} data-portal={kind}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">ALSVID</Link>
        <nav className={styles.primaryNavigation} aria-label="主导航">
          {primaryNavigation.map((item) => <NavEntry item={item} primary key={item.label} />)}
        </nav>
        <div className={styles.headerTools}>
          <ThemeToggle />
          <Link className={styles.launcherLink} href="/">工作入口 ↗</Link>
        </div>
      </header>

      <div className={styles.secondaryNav}>
        <div className={styles.secondaryNavInner}>
          <strong>{config.subtitle}</strong>
          <nav aria-label={`${config.subtitle}导航`}>
            {config.links.map((item) => <NavEntry item={item} key={`${item.label}-${item.href}`} />)}
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
