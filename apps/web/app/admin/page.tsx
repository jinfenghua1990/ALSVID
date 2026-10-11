import Link from 'next/link';
import { PortalShell } from '../_components/portal-shell';
import styles from './portal-page.module.css';

const adminModules = [
  { name: '产品与工程', detail: '平台、车型、SKU、工程资料', status: '已可用', href: '/product' },
  { name: '采购与运营', detail: '供应、生产、质检、库存与物流', status: '已可用', href: '/supply' },
  { name: '商业工作台', detail: '经销商、合作伙伴、电商渠道与财务', status: '已可用', href: '/commerce' },
  { name: '车辆中心', detail: 'Vehicle 360、交付、所有权与售后', status: '基础 / 持续建设', href: '/production' },
  { name: '员工中心', detail: '员工主数据与后续账号开通接口', status: '骨架', href: '/people/employees' },
  { name: '环境与基础设施', detail: 'Test / Production 安全状态与配置情况', status: '已可用', href: '/settings/environment' },
] as const;

export default function AdminPortalPage() {
  return (
    <PortalShell kind="admin">
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>ALSVID / INTERNAL ADMIN</p><h1>Admin Center</h1><p>内部运营入口。现有管理页面保持原路由与功能，本页提供统一入口和实施状态。</p></div>
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
    </PortalShell>
  );
}
