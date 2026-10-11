import { requireInternalPreviewSession } from '../_lib/portal-access';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import styles from './portal-page.module.css';

const series = [
  ['FC Series', 'Folding Carbon', 'FC1 / FC1 Pro'],
  ['CT Series', 'City Touring', 'CT1'],
  ['FT Series', 'Fat Tire', 'FT1'],
  ['GT Series', 'Grand Touring', 'GT1'],
];

const stats = [
  ['产品系列', '4'],
  ['车型 / SKU', '5'],
  ['BOM 清单', '128'],
  ['供应商', '28'],
  ['待处理售后', '7'],
];

export default async function AdminPortalPage() {
  await requireInternalPreviewSession();

  return (
    <AppShell navigation={navigationFor('/admin')} footer="ALSVID · Internal Platform">
      <div className={styles.layout}>
        <aside className={styles.side}>
          <h2>产品中心</h2>
          {['产品系列','产品型号','配置管理','外观与颜色','技术资料','BOM 结构','供应商','图片 / 视频素材'].map((item, index) => (
            <div className={index === 0 ? styles.active : ''} key={item}>{item}</div>
          ))}
        </aside>
        <main>
          <header className={styles.hero}>
            <div>
              <p>ALSVID PRODUCT CENTER</p>
              <h1>ALSVID 产品中心</h1>
              <span>从产品系列、车型配置到配件 BOM，统一管理品牌核心产品资产。</span>
            </div>
          </header>

          <section>
            <h2 className={styles.title}>产品系列</h2>
            <div className={styles.seriesGrid}>
              {series.map(([name, desc, models]) => <article key={name}><strong>{name}</strong><b>{desc}</b><p>车型：{models}</p></article>)}
            </div>
          </section>

          <section className={styles.stats}>
            {stats.map(([name, value]) => <div key={name}><small>{name}</small><strong>{value}</strong></div>)}
          </section>

          <section className={styles.tracking}>
            <h2>Vehicle 360 全流程追踪</h2>
            <p>记录车辆从生产到售后的生命周期档案，不提供实时联网健康检测。</p>
            <div>生产 → 质检 → 入库 → 出货 → 经销商 → 客户 → 售后</div>
          </section>
        </main>
      </div>
    </AppShell>
  );
}
