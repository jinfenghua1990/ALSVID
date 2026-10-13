import Link from 'next/link';
import { requirePortalSession } from '../../_lib/portal-access';
import { OwnerShell } from '../../_components/owner-shell';
import styles from '../owner-portal.module.css';

const services = [
  ['保修状态', '按具体车辆展示真实保修覆盖、起止日期与权益。'],
  ['售后申请', '问题与照片围绕车辆提交，并持续追踪处理进度。'],
  ['维修记录', '沉淀检测、维修、替换配件与完成时间。'],
] as const;

export default async function MyServicePage() {
  await requirePortalSession('my', '/my/service');

  return (
    <OwnerShell activeHref="/my/service">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>MY ALSVID / SERVICE</p>
          <h1>服务与售后</h1>
          <p>从保修到维修，每一次服务都进入对应车辆的生命周期档案，并与内部售后和经销商服务视角保持一致。</p>
        </header>

        <section className={styles.serviceGrid}>
          {services.map(([title, copy]) => <article className={styles.serviceCard} key={title}><strong>{title}</strong><p>{copy}</p></article>)}
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.card}>
            <div className={styles.sectionHeader}>
              <div><h2>我的服务</h2><p>没有进行中的真实服务或售后工单。</p></div>
              <Link className={styles.primaryAction} href="/my/service/new">申请服务</Link>
            </div>
            <div className={styles.emptyList}>绑定车辆并产生服务记录后，这里显示状态、进度和完整历史。</div>
          </article>

          <aside className={styles.card}>
            <h2>服务链路</h2>
            <div className={styles.steps}>
              <div className={styles.step}><span className={styles.stepIndex}>1</span><div><strong>提交问题</strong><p>选择车辆和问题类型，补充图片或视频。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>2</span><div><strong>诊断处理</strong><p>ALSVID / 经销商在同一服务事实下协作。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>3</span><div><strong>写入历史</strong><p>完成结果进入这台车的长期服务档案。</p></div></div>
            </div>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
