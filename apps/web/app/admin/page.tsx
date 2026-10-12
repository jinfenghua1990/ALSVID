import Link from 'next/link';
import { requireInternalPreviewSession } from '../_lib/portal-access';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import styles from './portal-page.module.css';

const series = [
  { code: 'FC1', name: 'FC Series', detail: '折叠碳纤维旗舰系列', english: 'Folding Carbon', tone: 'city' },
  { code: 'CT1', name: 'CT Series', detail: '都市通勤系列', english: 'City Touring', tone: 'forest' },
  { code: 'FT1', name: 'FT Series', detail: '胖胎全地形系列', english: 'Fat Tire', tone: 'travel' },
  { code: 'GT1', name: 'GT Series', detail: '长途旅行系列', english: 'Grand Touring', tone: 'grand' },
] as const;

const metrics = [
  { label: '产品系列', href: '/product#series', icon: '◇', tone: 'blue' },
  { label: '产品型号', href: '/product#models', icon: '◉', tone: 'green' },
  { label: '经销商数量', href: '/dealers', icon: '▣', tone: 'purple' },
  { label: '订单总数', href: '/commerce', icon: '▤', tone: 'orange' },
  { label: '待处理售后', href: '/vehicle360', icon: '×', tone: 'red' },
  { label: '客户数量', href: '#', icon: '○', tone: 'cyan' },
] as const;

const emptyPanelStyle = {
  minHeight: 190,
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: 10,
  color: 'var(--alsvid-muted)',
  fontSize: 12,
} as const;

export default async function AdminPortalPage() {
  await requireInternalPreviewSession();

  return (
    <AppShell navigation={navigationFor('/admin')} footer="ALSVID · 内部管理">
      <section className={styles.hero}>
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>ALSVID</p>
          <h1>Explore Further</h1>
          <p className={styles.heroChinese}>为更远的探索而生</p>
          <p className={styles.heroMeta}>折叠 · 都市 · 胖胎 · 长途</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/product#series">了解产品系列 <span>→</span></Link>
            <Link className={styles.secondaryAction} href="/product">查看品牌资料</Link>
          </div>
        </div>
        <div className={styles.heroSlogan}>
          <span>LIGHTER</span><span>SMARTER</span><span>FURTHER</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>产品系列</h2>
          <Link href="/product#series">查看全部产品 <span>→</span></Link>
        </div>
        <div className={styles.seriesGrid}>
          {series.map((item) => (
            <Link className={`${styles.seriesCard} ${styles[item.tone]}`} href="/product#series" key={item.code}>
              <div className={styles.seriesOverlay} />
              <div className={styles.seriesCopy}>
                <strong>{item.code}</strong>
                <span>{item.detail}</span>
                <small>{item.english}</small>
              </div>
              <span className={styles.seriesArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.metricSection}>
        <div className={styles.sectionHeadCompact}>
          <h2>关键数据</h2>
          <div className={styles.periodTabs}><span className={styles.periodActive}>本月</span><span>本季度</span><span>本年</span></div>
        </div>
        <div className={styles.metrics}>
          {metrics.map((metric) => (
            <Link className={styles.metricCard} href={metric.href} key={metric.label}>
              <span className={`${styles.metricIcon} ${styles[metric.tone]}`}>{metric.icon}</span>
              <div>
                <span className={styles.metricLabel}>{metric.label}</span>
                <strong aria-label="暂无数据">&nbsp;</strong>
                <small>&nbsp;</small>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`${styles.panel} ${styles.trendPanel}`}>
          <header className={styles.panelHead}>
            <div><span>运营概览</span><h3>订单趋势</h3></div>
          </header>
          <div style={emptyPanelStyle}>
            <span>暂无数据</span>
            <Link href="/commerce" style={{ color: 'var(--alsvid-accent)', fontWeight: 700 }}>录入 / 查看订单 →</Link>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.distributionPanel}`}>
          <header className={styles.panelHead}><div><span>产品结构</span><h3>销售分布（按系列）</h3></div></header>
          <div style={emptyPanelStyle}>
            <span>暂无数据</span>
            <Link href="/product" style={{ color: 'var(--alsvid-accent)', fontWeight: 700 }}>管理产品 →</Link>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.activityPanel}`}>
          <header className={styles.panelHead}><div><span>最新动态</span><h3>业务活动</h3></div></header>
          <div style={emptyPanelStyle}><span>暂无数据</span></div>
        </article>
      </section>
    </AppShell>
  );
}
