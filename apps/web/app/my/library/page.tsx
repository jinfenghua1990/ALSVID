import Link from 'next/link';
import { requirePortalSession } from '../../_lib/portal-access';
import { OwnerShell } from '../../_components/owner-shell';
import styles from '../owner-portal.module.css';

export default async function MyLibraryPage() {
  await requirePortalSession('my', '/my/library');

  return (
    <OwnerShell activeHref="/my/library">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>MY ALSVID / LIBRARY</p>
          <h1>资料与配件</h1>
          <p>这里不做普通商城列表。说明书和配件都应从车辆真实型号、版本和 Build Specification 派生。</p>
        </header>

        <section className={styles.contentGrid}>
          <div>
            <article className={styles.card} id="help">
              <h2>车辆资料</h2>
              <p>绑定车辆后，只展示与你车辆版本匹配的资料。</p>
              <div className={styles.libraryGroup}>
                <div className={styles.libraryItem}><strong>用户手册</strong><span>等待车辆版本</span></div>
                <div className={styles.libraryItem}><strong>快速开始</strong><span>等待车辆版本</span></div>
                <div className={styles.libraryItem}><strong>电池安全指南</strong><span>等待车辆版本</span></div>
                <div className={styles.libraryItem}><strong>维护与故障排查</strong><span>等待车辆版本</span></div>
              </div>
            </article>

            <article className={styles.card} id="accessories">
              <h2>适配配件</h2>
              <p>只推荐确认兼容当前车辆版本的 ALSVID 配件，购买动作继续由 Shopify 负责。</p>
              <div className={styles.emptyList}>绑定车辆后显示兼容配件，不在这里复制 Shopify 商品目录。</div>
            </article>
          </div>

          <aside className={styles.card}>
            <h2>先建立车辆档案</h2>
            <p>车型相同也可能因为版本、配置或生产批次不同而使用不同资料和配件。</p>
            <div style={{ marginTop: 20 }}><Link className={styles.primaryAction} href="/my/vehicles/register">添加车辆</Link></div>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
