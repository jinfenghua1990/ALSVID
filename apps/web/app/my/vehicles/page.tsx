import Link from 'next/link';
import { requirePortalSession } from '../../_lib/portal-access';
import { OwnerShell } from '../../_components/owner-shell';
import styles from '../owner-portal.module.css';

export default async function MyVehiclesPage() {
  await requirePortalSession('my', '/my/vehicles');

  return (
    <OwnerShell activeHref="/my/vehicles">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>MY ALSVID / VEHICLES</p>
          <h1>我的车辆</h1>
          <p>一台车对应一个长期数字档案。VIN、所有权、保修、维修、售后和资料都从这里关联。</p>
        </header>

        <section className={styles.contentGrid}>
          <div>
            <article className={styles.card}>
              <div className={styles.sectionHeader}>
                <div><h2>你的车库</h2><p>当前没有已确认的 ALSVID 车辆。</p></div>
                <Link className={styles.primaryAction} href="/my/vehicles/register">+ 添加车辆</Link>
              </div>
              <div className={styles.emptyList}>车辆绑定并通过所有权核验后，会在这里显示车型、VIN、保修和服务入口。</div>
            </article>
          </div>

          <aside className={styles.card}>
            <h2>车辆如何进入车库</h2>
            <p>绑定动作不会绕过所有权校验。</p>
            <div className={styles.steps}>
              <div className={styles.step}><span className={styles.stepIndex}>1</span><div><strong>识别车辆</strong><p>输入 VIN / 车架号，匹配 ALSVID 车辆身份。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>2</span><div><strong>核验关系</strong><p>结合交付、购买或审核事实确认车辆与你的关系。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>3</span><div><strong>建立档案</strong><p>确认后开放保修、历史、售后、资料与配件。</p></div></div>
            </div>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
