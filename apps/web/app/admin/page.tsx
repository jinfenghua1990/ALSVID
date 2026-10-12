import Link from 'next/link';
import { requireInternalPreviewSession } from '../_lib/portal-access';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import styles from './portal-page.module.css';

const series = [
  { code: 'FC1', name: 'FC Series', detail: '城市通勤系列', english: 'Folding Carbon', tone: 'city' },
  { code: 'CT1', name: 'CT Series', detail: '全地形系列', english: 'City Touring', tone: 'forest' },
  { code: 'FT1', name: 'FT Series', detail: '旅行探索系列', english: 'Fat Tire', tone: 'travel' },
  { code: 'GT1', name: 'GT Series', detail: '高性能系列', english: 'Grand Touring', tone: 'grand' },
] as const;

const metrics = [
  { label: '产品系列', value: '4', detail: 'FC · CT · FT · GT', icon: '◇', tone: 'blue' },
  { label: '产品型号', value: '5', detail: '当前产品结构', icon: '◉', tone: 'green' },
  { label: '经销商数量', value: '—', detail: '接入业务数据后显示', icon: '▣', tone: 'purple' },
  { label: '订单总数', value: '—', detail: '接入 Shopify 后显示', icon: '▤', tone: 'orange' },
  { label: '待处理售后', value: '—', detail: '售后模块接入后显示', icon: '×', tone: 'red' },
  { label: '客户数量', value: '—', detail: '客户中心接入后显示', icon: '○', tone: 'cyan' },
] as const;

const activities = [
  { icon: '◉', title: 'FC1 Pro 产品资料', detail: '产品中心 · 已纳入 V2 结构', time: '产品' },
  { icon: '↗', title: '订单与渠道数据', detail: '等待外部系统事实接入', time: '订单' },
  { icon: '×', title: '售后记录', detail: '按客户 / 经销商反馈形成记录', time: '售后' },
  { icon: '◇', title: 'Vehicle 360', detail: '用于车辆全流程追踪，不做实时健康监控', time: '车辆' },
] as const;

export default async function AdminPortalPage() {
  await requireInternalPreviewSession();

  return (
    <AppShell navigation={navigationFor('/admin')} footer="ALSVID · Internal Platform">
      <section className={styles.hero}>
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>ALSVID</p>
          <h1>Explore Further</h1>
          <p className={styles.heroChinese}>为更远的探索而生</p>
          <p className={styles.heroMeta}>折叠 · 都市 · 越野 · 长途</p>
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
            <article className={styles.metricCard} key={metric.label}>
              <span className={`${styles.metricIcon} ${styles[metric.tone]}`}>{metric.icon}</span>
              <div>
                <span className={styles.metricLabel}>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`${styles.panel} ${styles.trendPanel}`}>
          <header className={styles.panelHead}>
            <div><span>运营概览</span><h3>订单趋势</h3></div>
            <div className={styles.legend}><span><i className={styles.dotBlue} />订单数量</span><span><i className={styles.dotGreen} />出货数量</span></div>
          </header>
          <div className={styles.chartPlaceholder} aria-label="订单趋势数据接入提示">
            <svg viewBox="0 0 760 250" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="areaA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f80ff" stopOpacity=".24"/><stop offset="1" stopColor="#2f80ff" stopOpacity="0"/></linearGradient>
                <linearGradient id="areaB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2fc79a" stopOpacity=".18"/><stop offset="1" stopColor="#2fc79a" stopOpacity="0"/></linearGradient>
              </defs>
              <path d="M0 208 C80 180 120 188 180 150 S285 175 350 116 455 146 515 92 625 128 760 42 L760 250 L0 250Z" fill="url(#areaA)"/>
              <path d="M0 222 C72 208 110 184 174 198 S285 140 355 164 460 105 530 138 640 60 760 98 L760 250 L0 250Z" fill="url(#areaB)"/>
              <path d="M0 208 C80 180 120 188 180 150 S285 175 350 116 455 146 515 92 625 128 760 42" fill="none" stroke="#2f80ff" strokeWidth="4"/>
              <path d="M0 222 C72 208 110 184 174 198 S285 140 355 164 460 105 530 138 640 60 760 98" fill="none" stroke="#2fc79a" strokeWidth="4"/>
            </svg>
            <span>当前为界面占位示意，接入订单事实后显示真实趋势。</span>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.distributionPanel}`}>
          <header className={styles.panelHead}><div><span>产品结构</span><h3>销售分布（按系列）</h3></div></header>
          <div className={styles.distributionBody}>
            <div className={styles.donut}><span><strong>4</strong><small>产品系列</small></span></div>
            <div className={styles.distributionList}>
              <span><i className={styles.fcDot} />FC Series <b>待接入</b></span>
              <span><i className={styles.ctDot} />CT Series <b>待接入</b></span>
              <span><i className={styles.ftDot} />FT Series <b>待接入</b></span>
              <span><i className={styles.gtDot} />GT Series <b>待接入</b></span>
            </div>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.activityPanel}`}>
          <header className={styles.panelHead}><div><span>ACTIVITY</span><h3>最新动态</h3></div><Link href="/product">查看更多 →</Link></header>
          <div className={styles.activityList}>
            {activities.map((item) => (
              <div className={styles.activityRow} key={item.title}>
                <span className={styles.activityIcon}>{item.icon}</span>
                <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
