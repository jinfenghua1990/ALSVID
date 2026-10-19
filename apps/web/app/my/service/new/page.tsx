import Link from 'next/link';
import { requirePortalSession } from '../../../_lib/portal-access';
import { OwnerShell } from '../../../_components/owner-shell';
import { getOwnerGarage } from '../../_data/garage-live';
import styles from '../../owner-portal.module.css';
import garage from '../../garage.module.css';

const issueTypes = ['产品问题', '配件问题', '维修申请', '保修申请'] as const;

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
          <p>先选择车辆，再描述问题。我们会用车辆档案中的 VIN 与保修状态判断处理路径。</p>
        </header>

        <section className={styles.contentGrid}>
          <article className={styles.card}>
            <div className={styles.form} aria-label="售后申请表单">
              <div className={styles.field}>
                <label htmlFor="vehicle">选择车辆</label>
                <select id="vehicle" name="vehicle" defaultValue={preselected ?? ''}>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.model} · {vehicle.vin}
                    </option>
                  ))}
                </select>
                <small>只能选择已通过所有权核验的车辆。</small>
              </div>

              <div className={styles.field}>
                <label>问题类型</label>
                <div className={garage.checkGrid}>
                  {issueTypes.map((type) => (
                    <label className={garage.check} key={type}>
                      <input type="checkbox" name={type} />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="description">问题描述</label>
                <textarea id="description" name="description" placeholder="发生了什么？什么时候开始的？" />
              </div>

              <div className={styles.field}>
                <label>上传照片</label>
                <div className={styles.uploadBox}>拖拽或点击上传（接口接入后开放）</div>
              </div>

              <button className={styles.disabledButton} type="button" disabled>提交申请</button>
              <div className={styles.notice}>当前先完成 UI。售后工单接口与附件存储接入后，这里才会真正创建申请。</div>
            </div>
          </article>

          <aside className={styles.card}>
            <h2>处理路径</h2>
            <div className={styles.steps}>
              <div className={styles.step}><span className={styles.stepIndex}>1</span><div><strong>提交</strong><p>绑定车辆与问题类型，形成工单。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>2</span><div><strong>核验</strong><p>结合保修与服务记录判断责任范围。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>3</span><div><strong>处理</strong><p>经销商或内部团队接单并回写进度。</p></div></div>
            </div>
            <Link className={styles.secondaryAction} href="/my/service" style={{ marginTop: '18px' }}>返回服务与售后</Link>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
