import Link from 'next/link';
import { requireInternalPreviewSession } from '../_lib/portal-access';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import styles from './portal-page.module.css';

const series = [
  { code: 'FC', name: 'FC Series', detail: 'Folding Carbon', models: 'FC1 / FC1 Pro' },
  { code: 'CT', name: 'CT Series', detail: 'City Touring', models: 'CT1' },
  { code: 'FT', name: 'FT Series', detail: 'Fat Tire', models: 'FT1' },
  { code: 'GT', name: 'GT Series', detail: 'Grand Touring', models: 'GT1' },
] as const;

const modules = [
  { name: '产品中心', detail: '产品系列、车型、Variant、SKU 与工程资料', status: '已可用', href: '/product' },
  { name: 'Vehicle 360', detail: '当前可查看生产、质检与车辆出生记录；交付和所有权档案待完善', status: '基础', href: '/production' },
  { name: '订单管理', detail: '查看外部商业订单事实、供应、库存、物流与结算', status: '已可用', href: '/commerce' },
  { name: '经销商', detail: '经销商与合作伙伴业务信息', status: '已可用', href: '/dealers' },
  { name: '售后服务', detail: '保修、维修与配件历史工作台', status: '规划中', href: null },
  { name: '系统设置', detail: '员工、权限、集成与环境配置', status: '部分可用', href: '/settings/environment' },
] as const;

const lifecycle = ['生产', '质检', '入库', '出货', '经销商', '客户', '售后'] as const;

export default async function AdminPortalPage() {
  await requireInternalPreviewSession();

  return (
    <AppShell navigation={navigationFor('/admin')} footer="ALSVID · Internal Platform">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>ALSVID INTERNAL PLATFORM</p>
          <h1>品牌、车辆与运营，统一工作入口。</h1>
          <p className={styles.lead}>产品中心管理“卖什么”，Vehicle 360 管理“每一台真实车辆发生过什么”。订单、经销商与售后围绕这两条主线展开。</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/product">进入产品中心</Link>
            <Link className={styles.secondaryAction} href="/production">查看生产与车辆出生记录</Link>
          </div>
        </div>
        <div className={styles.heroMark} aria-hidden="true">
          <span>ALSVID</span>
          <strong>01</strong>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div><span>工作区</span><h2>当前业务入口</h2></div>
          <p>未完成模块明确标记状态，不伪造已连接能力。</p>
        </div>
        <div className={styles.moduleGrid}>
          {modules.map((module) => module.href ? (
            <Link className={styles.moduleCard} href={module.href} key={module.name}>
              <span className={styles.moduleStatus}>{module.status}</span>
              <h3>{module.name}<span aria-hidden="true">↗</span></h3>
              <p>{module.detail}</p>
            </Link>
          ) : (
            <article className={`${styles.moduleCard} ${styles.moduleCardDisabled}`} key={module.name}>
              <span className={styles.moduleStatus}>{module.status}</span>
              <h3>{module.name}</h3>
              <p>{module.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div><span>PRODUCT SERIES</span><h2>产品系列</h2></div>
          <Link href="/product">管理产品资产 →</Link>
        </div>
        <div className={styles.seriesGrid}>
          {series.map((item) => (
            <Link className={styles.seriesCard} href="/product#series" key={item.code}>
              <span>{item.code}</span>
              <div><strong>{item.name}</strong><b>{item.detail}</b></div>
              <p>{item.models}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.vehicleSection}>
        <div className={styles.vehicleCopy}>
          <span>VEHICLE 360</span>
          <h2>一台车，从出生到售后的完整档案。</h2>
          <p>当前 Vehicle 360 是业务全流程追踪，不是联网车辆健康监控。没有实时 GPS、BMS、OTA 或远程诊断数据时，界面不会制造这些状态。</p>
          <Link href="/production">查看生产与车辆出生记录 →</Link>
        </div>
        <div className={styles.lifecycle}>
          {lifecycle.map((step, index) => (
            <div className={styles.lifecycleStep} key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
