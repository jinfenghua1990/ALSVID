import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './portal-shell.module.css';

export type PortalKind = 'admin' | 'dealer' | 'my';

type PortalLink = { label: string; href: string; status?: string };

const portalConfig: Record<PortalKind, { name: string; subtitle: string; links: PortalLink[] }> = {
  admin: {
    name: 'Admin Center',
    subtitle: '内部管理',
    links: [
      { label: '管理概览', href: '/admin' },
      { label: '产品与工程', href: '/product', status: '基础可用' },
      { label: '采购 / 供应', href: '/supply', status: '基础可用' },
      { label: '生产 / 质检', href: '/production', status: '基础可用' },
      { label: '库存 / 仓库', href: '/inventory', status: '基础可用' },
      { label: '物流', href: '/logistics', status: '基础可用' },
      { label: '电商渠道', href: '/commerce', status: '基础可用' },
      { label: '人员 / 系统', href: '/people/employees', status: '骨架' },
    ],
  },
  dealer: {
    name: 'Dealer Portal',
    subtitle: '经销商门户',
    links: [
      { label: '工作台', href: '/dealer' },
      { label: '我的公司', href: '/dealer/company', status: '待开发' },
      { label: '订单与物流', href: '/dealer/orders', status: '待开发' },
      { label: '车辆与交付', href: '/dealer/vehicles', status: '待开发' },
      { label: '售后与保修', href: '/dealer/service', status: '待开发' },
    ],
  },
  my: {
    name: 'My ALSVID',
    subtitle: '车主服务',
    links: [
      { label: '我的车库', href: '/my' },
      { label: '车辆档案', href: '/my/vehicles', status: '待开发' },
      { label: '保修与服务', href: '/my/service', status: '待开发' },
      { label: '说明书与配件', href: '/my/library', status: '待开发' },
      { label: '账户与偏好', href: '/my/account', status: '待开发' },
    ],
  },
};

export function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const config = portalConfig[kind];
  return (
    <div className={styles.portal} data-portal={kind}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/portal-launcher" aria-label="返回 ALSVID 门户入口">
          <span className={styles.brandMark}>A</span>
          <span>ALSVID</span>
        </Link>
        <span className={styles.portalName}>{config.name}</span>
        <Link className={styles.launcherLink} href="/portal-launcher">门户入口 <span aria-hidden="true">↗</span></Link>
      </header>
      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label={config.subtitle + '导航'}>
          <div className={styles.sidebarLabel}>{config.subtitle}</div>
          <nav>
            {config.links.map((item) => (
              item.status === '待开发' ? (
                <span className={styles.navLink} aria-disabled="true" key={item.href}>
                  <span>{item.label}</span><small>{item.status}</small>
                </span>
              ) : (
                <Link className={styles.navLink} href={item.href} key={item.href}>
                  <span>{item.label}</span>
                  {item.status ? <small>{item.status}</small> : null}
                </Link>
              )
            ))}
          </nav>
          {kind !== 'admin' ? <p className={styles.scopeNote}>页面仅为体验骨架。登录身份、组织/车主关系和服务端数据权限接入后，才会显示真实业务记录。</p> : null}
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
