import Link from 'next/link';
import { requireInternalPreviewSession } from '../_lib/portal-access';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import styles from './portal-page.module.css';

const adminModules = [
  { name: '产品与工程', detail: '平台、车型、SKU、工程资料', status: '已可用', href: '/product' },
  { name: '采购与运营', detail: '供应、生产、质检、库存与物流', status: '已可用', href: '/supply' },
  { name: '商业工作台', detail: '经销商、合作伙伴、电商渠道与财务', status: '已可用', href: '/commerce' },
  { name: '车辆中心', detail: 'Vehicle 360、交付、所有权与售后', status: '基础 / 持续建设', href: '/production' },
  { name: '员工中心', detail: '员工主数据与后续账号开通接口', status: '骨架', href: '/people/employees' },
  { name: '环境与基础设施', detail: '开发 / 正式环境配置可见性', status: '已可用', href: '/settings/environment' },
] as const;

export default async function AdminPortalPage() {
  await requireInternalPreviewSession();
  return (
    <AppShell navigation={navigationFor('/admin')} footer="ALSVID · 内部管理">
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>ALSVID / 内部管理</p><h1>内部管理中心</h1><p>选择业务模块，进入产品、运营与车辆服务工作台。</p></div>
        <span className={styles.badge}>内部预览</span>
      </header>
      <section className={styles.moduleGrid} aria-label="管理模块">
        {adminModules.map((module) => (
          <Link className={styles.moduleCard} href={module.href} key={module.name}>
            <span className={styles.moduleStatus}>{module.status}</span>
            <h2>{module.name}<span aria-hidden="true"> →</span></h2>
            <p>{module.detail}</p>
          </Link>
        ))}
      </section>
      <div className={styles.callout}><strong>模块状态透明</strong><span>尚未接入的能力会标为“预览 / 待开发”。当前模块卡片只链接到仓库中已有的工作台，不伪造数据或操作。</span></div>
    </AppShell>
  );
}
