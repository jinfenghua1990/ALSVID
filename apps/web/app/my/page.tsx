import { requirePortalSession } from '../_lib/portal-access';
import { PortalShell } from '../_components/portal-shell';
import styles from '../admin/portal-page.module.css';

const features = [
  ['车辆档案', '车型、配置、车架号与激活状态', '页面已就位'],
  ['保修与服务', '保修覆盖、维修记录与售后申请', '页面已就位'],
  ['说明书与配件', '适配当前车辆版本的资料和配件', '页面已就位'],
  ['所有权与转让', '可信交付凭据、所有权历史与转让流程', '页面已就位'],
] as const;

export default async function MyALSVIDPage() {
  await requirePortalSession('my', '/my');
  return (
    <PortalShell kind="my" activeHref="/my">
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>ALSVID / OWNER PORTAL</p><h1>我的车库</h1><p>以车辆为中心，查看属于你的 ALSVID 自行车、车辆历史和下一步可办理的服务。没有真实车辆关系时保持空置。</p></div>
        <span className={styles.badge}>车主门户骨架 · 身份关系待接入</span>
      </header>
      <section className={styles.moduleGrid} aria-label="车主服务功能">
        {features.map(([name, detail, status]) => (
          <article className={styles.moduleCard} key={name}>
            <span className={styles.moduleStatus}>{status}</span><h2>{name}</h2><p>{detail}</p>
          </article>
        ))}
      </section>
      <div className={styles.callout} style={{ marginTop: 13 }}><strong>车主数据保护</strong><span>注册账号或知道车架号都不会自动获得车辆所有权。车辆只有在可信交付、激活或审核关系成立后才会进入车库。</span></div>
    </PortalShell>
  );
}
