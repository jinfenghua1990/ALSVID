import Link from 'next/link';
import { requirePortalSession } from '../../_lib/portal-access';
import { OwnerShell } from '../../_components/owner-shell';
import { getOwnerGarage } from '../_data/garage';
import styles from '../owner-portal.module.css';
import garage from '../garage.module.css';

export default async function MyServicePage() {
  await requirePortalSession('my', '/my/service');

  const { vehicles } = await getOwnerGarage();
  const openRepairs = vehicles.flatMap((vehicle) =>
    vehicle.repairs
      .filter((repair) => repair.status !== 'done')
      .map((repair) => ({ vehicle, repair })),
  );

  return (
    <OwnerShell activeHref="/my/service">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>MY ALSVID / SERVICE</p>
          <h1>服务与售后</h1>
          <p>所有申请都绑定到具体车辆。保修、维修、配件问题都从这里提交并追踪。</p>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><h2>进行中的申请</h2><p>{openRepairs.length > 0 ? `共 ${openRepairs.length} 条待处理。` : '当前没有进行中的申请。'}</p></div>
            <Link className={styles.primaryAction} href="/my/service/new">+ 提交售后</Link>
          </div>

          {openRepairs.length > 0 ? (
            <div className={garage.timeline}>
              {openRepairs.map(({ vehicle, repair }) => (
                <div className={garage.timelineItem} key={repair.id}>
                  <span className={garage.timelineDate}>{repair.code}</span>
                  <div className={garage.timelineBody}>
                    <strong>{vehicle.model} · {repair.issue}</strong>
                    <p>处理状态：{repair.statusLabel}</p>
                    <div className={garage.timelineMeta}>提交于 {repair.openedAt}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <article className={styles.card}>
              <div className={styles.emptyList}>提交申请后，这里会显示处理状态与进度。</div>
            </article>
          )}
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.card}>
            <h2>申请类型</h2>
            <div className={garage.checkGrid} style={{ marginTop: '18px' }}>
              <span className={garage.check}>产品问题</span>
              <span className={garage.check}>配件问题</span>
              <span className={garage.check}>维修申请</span>
              <span className={garage.check}>保修申请</span>
            </div>
          </article>

          <aside className={styles.card}>
            <h2>需要帮助？</h2>
            <p>申请会自动带上车辆 VIN 与购买信息，不需要重复填写。</p>
            <Link className={styles.secondaryAction} href="/my/vehicles" style={{ marginTop: '18px' }}>选择车辆</Link>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
