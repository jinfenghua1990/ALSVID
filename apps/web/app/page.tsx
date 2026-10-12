import Link from 'next/link';
import { readInternalPreviewSession } from './_lib/portal-access';
import { PortalLoginGate } from './_components/portal-login';
import styles from './portal-launcher/portal-launcher.module.css';

const portals = [
  { title: '内部管理中心', english: 'Admin Center', audience: 'ALSVID 内部员工', description: '产品、采购、生产、库存、商业、人员与系统管理。现有内管工作台继续保留并逐步纳入统一入口。', href: '/admin', tag: '内部管理', mark: '01' },
  { title: '经销商门户', english: 'Dealer Portal', audience: '已授权经销商用户', description: '查看本经销商的公司资料、订单物流、已售车辆与售后信息。B2B 下单跳转至授权的外部渠道。', href: '/dealer', tag: '经销商', mark: '02' },
  { title: '我的 ALSVID', english: 'My ALSVID', audience: '已验证车主 / 客户', description: '以我的车库为中心，查看车辆档案、保修、说明书、维修记录与适配配件。', href: '/my', tag: '车主服务', mark: '03' },
] as const;

export default async function PortalLauncherPage() {
  const session = await readInternalPreviewSession();
  const isProduction = process.env.ALSVID_ENV === 'production';
  const releaseSha = process.env.ALSVID_RELEASE_SHA;
  const release = releaseSha && /^[a-f0-9]{40}$/i.test(releaseSha) ? releaseSha.slice(0, 8) : '未提供';
  return (
    <PortalLoginGate authenticated={Boolean(session)}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.wordmark} href="/">△ ALSVID</Link>
          <div className={styles.headerRight}>
            <span className={styles.environment}><i /> {isProduction ? '正式/生产：ALSVID Production' : '开发/测试：ALSVID Development'}⌄</span>
            {session ? (
              <>
                <span className={styles.user}><b>◯</b><span>{session.displayName || 'ALSVID User'}<small>{session.email}</small></span></span>
                <Link className={styles.logout} href="/api/session/logout">↪ 退出</Link>
              </>
            ) : null}
          </div>
        </header>
        <section className={styles.intro}>
          <p className={styles.kicker}>ALSVID</p>
          <h1>ALSVID <small>INTERNAL PORTAL</small></h1>
          <p className={styles.lead}>ONE BRAND · THREE WORLDS · A CONNECTED FUTURE</p>
        </section>
        <section className={styles.cards} aria-label="选择门户">
          {portals.map((portal) => (
            <Link className={styles.card} href={portal.href} key={portal.href}>
              <div className={styles.cardTop}><span>{portal.tag}</span><span className={styles.mark}>{portal.mark}</span></div>
              <div className={styles.cardBody}>
                <div className={styles.english}>{portal.english}</div>
                <h2>{portal.title}<span aria-hidden="true">↗</span></h2>
                <p>{portal.description}</p>
              </div>
              <div className={styles.cardFoot}><span>{portal.audience}</span><span className={styles.enter}>→</span></div>
            </Link>
          ))}
        </section>
        <aside className={styles.statusBar}>
          <span>◉ <b>服务状态</b><strong>尚未检测</strong></span>
          <span>▱ <b>运行环境</b><strong>{isProduction ? '正式/生产：ALSVID Production' : '开发/测试：ALSVID Development'}</strong></span>
          <span>◇ <b>发布版本</b><strong>{release}</strong></span>
          <span>◷ <b>登录状态</b><strong>{session ? '已登录' : '未登录'}</strong></span>
        </aside>
        <footer className={styles.footer}><span>ALSVID &nbsp;|&nbsp; RIDE FURTHER · LIVE WIDER</span><Link href="/overview">返回管理概览</Link></footer>
      </main>
    </PortalLoginGate>
  );
}
