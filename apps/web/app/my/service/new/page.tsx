import Link from 'next/link';
import { requirePortalSession } from '../../../_lib/portal-access';
import { OwnerShell } from '../../../_components/owner-shell';
import styles from '../../owner-portal.module.css';

export default async function NewServiceRequestPage() {
  await requirePortalSession('my', '/my/service/new');

  return (
    <OwnerShell activeHref="/my/service/new">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>SERVICE REQUEST</p>
          <h1>告诉我们发生了什么。</h1>
          <p>售后申请必须绑定到具体车辆，这样诊断、配件和最终处理结果才能进入正确的车辆历史。</p>
        </header>

        <section className={styles.contentGrid}>
          <article className={styles.card}>
            <div className={styles.form} role="form" aria-label="售后申请预览">
              <div className={styles.field}>
                <label htmlFor="vehicle">车辆</label>
                <select id="vehicle" disabled><option>请先绑定车辆</option></select>
              </div>
              <div className={styles.field}>
                <label htmlFor="issue">问题类型</label>
                <select id="issue" defaultValue=""><option value="" disabled>选择问题类型</option><option>车辆故障</option><option>电气系统</option><option>电池</option><option>电机</option><option>制动系统</option><option>配件</option><option>其他</option></select>
              </div>
              <div className={styles.field}>
                <label htmlFor="description">问题描述</label>
                <textarea id="description" placeholder="描述问题出现的时间、现象和使用情况" />
              </div>
              <div className={styles.field}>
                <label>照片 / 视频</label>
                <div className={styles.uploadBox}>上传车辆问题照片或视频<br />媒体存储接入后开放</div>
              </div>
              <button className={styles.disabledButton} type="button" disabled>提交申请</button>
              <div className={styles.notice}>当前仅完成售后申请 UI，未接入服务领域写入接口，因此不会创建虚假工单。</div>
            </div>
          </article>

          <aside className={styles.card}>
            <h2>提交前</h2>
            <p>先绑定车辆可以自动带出车型、VIN、保修和实际配置，减少售后沟通成本，也避免配件匹配错误。</p>
            <div style={{ marginTop: 20 }}><Link className={styles.secondaryAction} href="/my/vehicles/register">添加车辆</Link></div>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
