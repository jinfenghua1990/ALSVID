import Link from 'next/link';
import { requireInternalPreviewSession } from '../_lib/portal-access';
import styles from './portal-launcher.module.css';

const portals = [
  { title: 'Admin Center', audience: 'ALSVID 内部员工', description: '产品、采购、生产、库存、商业、人员与系统管理。现有内管工作台继续保留并逐步纳入统一入口。', href: '/admin', tag: '内部管理', mark: '01' },
  { title: 'Dealer Portal', audience: '已授权经销商用户', description: '查看本经销商的公司资料、订单物流、已售车辆与售后信息。B2B 下单跳转至授权的外部渠道。', href: '/dealer', tag: '经销商', mark: '02' },
  { title: 'My ALSVID', audience: '已验证车主 / 客户', description: '以我的车库为中心，查看车辆档案、保修、说明书、维修记录与适配配件。', href: '/my', tag: '车主服务', mark: '03' },
] as const;

export default async function PortalLauncherPage() {
  await requireInternalPreviewSession();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/">ALSVID</Link>
        <span className={styles.environment}><i /> 内部预览 · 测试环境</span>
      </header>
      <section className={styles.intro}>
        <p className={styles.kicker}>ALSVID PLATFORM / PORTAL LAUNCHER</p>
        <h1>选择工作入口<span>。</span></h1>
        <p className={styles.lead}>同一套车辆生命周期数据，按用户身份和权限提供不同的工作界面。</p>
      </section>
      <section className={styles.cards} aria-label="选择门户">
        {portals.map((portal) => (
          <Link className={styles.card} href={portal.href} key={portal.href}>
            <div className={styles.cardTop}><span>{portal.tag}</span><span className={styles.mark}>{portal.mark}</span></div>
            <div className={styles.cardBody}>
              <h2>{portal.title}<span aria-hidden="true"> ↗</span></h2>
              <p>{portal.description}</p>
            </div>
            <div className={styles.cardFoot}><span>{portal.audience}</span><span className={styles.enter}>进入预览 →</span></div>
          </Link>
        ))}
      </section>
      <aside className={styles.notice}>
        <strong>预览说明</strong>
        <span>当前页面用于内部开发与验收，门户中的业务数据和账号授权尚未接入。预览入口不代表真实访问权限，也不会显示客户或经销商记录。</span>
      </aside>
      <footer className={styles.footer}><span>ALSVID · Vehicle lifecycle platform</span><Link href="/">返回现有管理概览</Link></footer>
    </main>
  );
}
