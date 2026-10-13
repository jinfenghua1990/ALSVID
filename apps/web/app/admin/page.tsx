import Link from 'next/link';
import { requireInternalPreviewSession } from '../_lib/portal-access';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import styles from './portal-page.module.css';

const metrics = [
  { label: '车辆生命周期', href: '/vehicle360', icon: '◉', tone: 'blue' },
  { label: '生产状态', href: '/production', icon: '⚙', tone: 'green' },
  { label: '订单履约', href: '/commerce', icon: '▤', tone: 'orange' },
  { label: '库存状态', href: '/inventory', icon: '□', tone: 'purple' },
  { label: '售后服务', href: '/after-sales', icon: '＋', tone: 'red' },
  { label: '经销商网络', href: '/dealers', icon: '◇', tone: 'cyan' },
] as const;

const panels = [
  ['产品中心', 'Product Platform', '/product'],
  ['Vehicle 360', '车辆全生命周期管理', '/vehicle360'],
  ['订单与供应链', 'Commerce & Supply', '/commerce'],
  ['售后中心', 'Service Lifecycle', '/after-sales'],
];

const emptyPanelStyle = { minHeight: 150, display: 'grid', placeItems: 'center', color: 'var(--alsvid-muted)', fontSize: 12 } as const;

export default async function AdminPortalPage() {
  await requireInternalPreviewSession();

  return (
    <AppShell navigation={navigationFor('/admin')} footer="ALSVID · Operations Center">
      <section className={styles.hero}>
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>ALSVID OPERATIONS</p>
          <h1>运营控制中心</h1>
          <p className={styles.heroChinese}>管理产品、车辆、订单与客户生命周期</p>
          <p className={styles.heroMeta}>Product · Vehicle · Commerce · Service</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>核心业务模块</h2></div>
        <div className={styles.moduleGrid}>
          {panels.map(([title, desc, href]) => (
            <Link href={href} className={styles.moduleCard} key={title}>
              <span className={styles.moduleStatus}>模块</span>
              <h2>{title}</h2>
              <p>{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.metricSection}>
        <div className={styles.sectionHeadCompact}><h2>实时运营状态</h2></div>
        <div className={styles.metrics}>
          {metrics.map((metric) => (
            <Link className={styles.metricCard} href={metric.href} key={metric.label}>
              <span className={`${styles.metricIcon} ${styles[metric.tone]}`}>{metric.icon}</span>
              <div><span className={styles.metricLabel}>{metric.label}</span><strong>&nbsp;</strong><small>暂无数据</small></div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.panel}>
          <header className={styles.panelHead}><div><span>LIVE</span><h3>业务动态</h3></div></header>
          <div style={emptyPanelStyle}>暂无实时业务数据</div>
        </article>
        <article className={styles.panel}>
          <header className={styles.panelHead}><div><span>DATA</span><h3>数据分析</h3></div></header>
          <div style={emptyPanelStyle}>数据接入后展示</div>
        </article>
      </section>
    </AppShell>
  );
}
