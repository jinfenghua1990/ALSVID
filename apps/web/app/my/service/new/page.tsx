import Link from 'next/link';
import { requirePortalSession } from '../../../_lib/portal-access';
import { OwnerShell } from '../../../_components/owner-shell';
import { getOwnerGarage } from '../../_data/garage-live';
import styles from '../../owner-portal.module.css';
import { OwnerServiceRequestForm } from './owner-service-request-form';

export default async function NewServiceRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>;
}) {
  await requirePortalSession('my', '/my/service/new');

  const { vehicle: preselected } = await searchParams;
  const { vehicles } = await getOwnerGarage();

  return (
    <OwnerShell activeHref="/my/service/new">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>AFTER-SALES REQUEST</p>
          <h1>提交售后</h1>
          <p>请选择一台已核验归属的 ALSVID 车辆并填写真实故障信息。申请会进入内部售后工作台，保修资格仍需审核。</p>
        </header>

        <section className={styles.contentGrid}>
          <article className={styles.card}>
            <OwnerServiceRequestForm vehicles={vehicles.map(v=>({id:v.id,model:v.model,frameNumber:v.frameNumber}))} preselected={preselected??''} />
          </article>

          <aside className={styles.card}>
            <h2>处理路径</h2>
            <div className={styles.steps}>
              <div className={styles.step}><span className={styles.stepIndex}>1</span><div><strong>提交</strong><p>绑定车辆与问题类型，形成工单。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>2</span><div><strong>核验</strong><p>结合保修与服务记录判断责任范围。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>3</span><div><strong>处理</strong><p>ALSVID 内部售后团队审核处理并回写状态；经销商协作后续开放。</p></div></div>
            </div>
            <Link className={styles.secondaryAction} href="/my/service" style={{ marginTop: '18px' }}>返回服务与售后</Link>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
