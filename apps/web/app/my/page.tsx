import { requireInternalPreviewSession } from '../_lib/portal-access';
import { PortalShell } from '../_components/portal-shell';
import styles from '../_components/portal-content.module.css';

const features = [
  ['车辆档案', '车型、配置、车架号与激活状态', '待开发'],
  ['保修与服务', '保修覆盖、维修记录与售后申请', '待开发'],
  ['说明书与配件', '适配当前车辆版本的资料和配件', '待开发'],
  ['所有权与转让', '可信交付凭据、所有权历史与转让流程', '待开发'],
] as const;

export default async function MyALSVIDPage() {
  await requireInternalPreviewSession();
  return (
    <PortalShell kind="my">
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>ALSVID / OWNER PORTAL</p><h1>我的车库</h1><p>以车辆为中心，查看属于你的 ALSVID 自行车、车辆历史和下一步可办理的服务。</p></div>
        <span className={styles.badge}>Preview · 待接入身份</span>
      </header>
      <section className={styles.moduleGrid} aria-label="车主服务功能预览">
        {features.map(([name, detail, status]) => (
          <article className={styles.moduleCard} key={name}>
            <span className={styles.moduleStatus}>{status}</span><h2>{name}</h2><p>{detail}</p>
          </article>
        ))}
      </section>
      <div className={styles.callout} style={{ marginTop: 13 }}><strong>车主数据保护</strong><span>注册账号或知道车架号都不会自动获得车辆所有权。车辆只有在可信交付、激活或审核关系成立后才会进入车库；没有车辆时保持空置。</span></div>
    </PortalShell>
  );
}
