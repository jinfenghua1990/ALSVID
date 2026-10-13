import Link from 'next/link';
import { requireInternalPreviewSession } from '../_lib/portal-access';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import styles from './portal-page.module.css';

/** 11 个固定模块的快捷入口（工作台为当前页，不重复列出） */
const quickLinks = [
  { label: '产品', href: '/product', icon: '◆' },
  { label: '订单', href: '/commerce', icon: '▤' },
  { label: '生产', href: '/production', icon: '⚙' },
  { label: '库存', href: '/inventory', icon: '□' },
  { label: '经销商', href: '/dealers', icon: '◇' },
  { label: '客户', href: '/customers', icon: '☺' },
  { label: '售后', href: '/after-sales', icon: '＋' },
  { label: '供应链', href: '/supply', icon: '⇄' },
  { label: '数据', href: '/overview', icon: '▦' },
  { label: '设置', href: '/settings/environment', icon: '⚒' },
] as const;

/** 待办与异常（#attention）——业务数据接入后自动填充，不显示模拟条目 */
const attentionItems = [
  { key: 'approvals', icon: '✓', tone: 'blue', title: '待我审批', desc: '采购订单 · 经销商准入 · 价格政策' },
  { key: 'production', icon: '⚠', tone: 'red', title: '生产异常', desc: '质检不合格 · 生产偏离 · 缺料停线' },
  { key: 'inventory', icon: '◔', tone: 'orange', title: '库存预警', desc: '低于安全库存 · 盘点差异 · 临期物料' },
  { key: 'after-sales', icon: '✉', tone: 'purple', title: '售后工单', desc: '新保修申请 · 待上门取件 · 客户催单' },
] as const;

const toneClass: Record<string, string> = {
  blue: styles.blue ?? '',
  green: styles.green ?? '',
  orange: styles.orange ?? '',
  purple: styles.purple ?? '',
  red: styles.red ?? '',
  cyan: styles.cyan ?? '',
};

/** 今日关键指标——保持空态，数据源接入后自动点亮 */
const keyMetrics = [
  { label: '在产车型', source: '生产', note: '等待 production 数据接入' },
  { label: '待履约订单', source: '订单', note: '等待 orders 数据接入' },
  { label: '保修工单', source: '售后', note: '等待 after-sales 数据接入' },
] as const;

const emptyPanelStyle = { minHeight: 150, display: 'grid', placeItems: 'center', color: 'var(--alsvid-muted)', fontSize: 12 } as const;

export default async function AdminPortalPage() {
  await requireInternalPreviewSession();
  return (
    <AppShell navigation={navigationFor('/admin')} footer="ALSVID · Operations Center">
      <section className={styles.hero}>
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>ALSVID OPERATIONS</p>
          <h1>工作台</h1>
          <p className={styles.heroChinese}>今天需要你处理的事，一目了然</p>
          <p className={styles.heroMeta}>Workbench · 只展示已接入的真实数据</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeadCompact}><h2>快捷入口</h2></div>
        <nav className={styles.quick} aria-label="业务模块快捷入口">
          {quickLinks.map((item) => (
            <Link className={styles.quickLink} href={item.href} key={item.label}>
              <span className={`${styles.quickIcon} ${toneClass.blue}`}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className={styles.section} id="attention">
        <div className={styles.sectionHeadCompact}><h2>待办与异常</h2></div>
        <div className={styles.attention}>
          {attentionItems.map((item) => (
            <article className={styles.attentionRow} key={item.key}>
              <span className={`${styles.attentionIcon} ${toneClass[item.tone]}`}>{item.icon}</span>
              <div className={styles.attentionBody}>
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </div>
              <span className={styles.attentionCount}>—</span>
            </article>
          ))}
        </div>
        <p className={styles.attentionHint}>业务数据接入后，这里会自动列出需要处理的审批、异常与工单。</p>
      </section>

      <section className={styles.section} id="overview">
        <div className={styles.sectionHeadCompact}><h2>今日关键指标</h2></div>
        <div className={styles.kpiTrio}>
          {keyMetrics.map((metric) => (
            <article className={styles.kpiCard} key={metric.label}>
              <div className={styles.kpiHead}><span>{metric.label}</span><em>{metric.source}</em></div>
              <strong>—</strong>
              <small>{metric.note}</small>
            </article>
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
