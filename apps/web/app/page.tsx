import Link from 'next/link';
import { ThemeToggle } from '@alsvid/ui';
import { readInternalPreviewSession } from './_lib/portal-access';
import { PortalLoginGate } from './_components/portal-login';
import styles from './portal-launcher/portal-launcher.module.css';

const portals = [
  { title: '内部管理中心', english: 'Admin Center', audience: 'ALSVID 内部员工', description: '产品、车辆、订单、经销商与系统管理。所有运营数据仅来自实际录入或已连接业务系统。', href: '/admin', tag: '内部管理', mark: '01' },
  { title: '经销商门户', english: 'Dealer Portal', audience: '已授权经销商用户', description: '查看本经销商的公司资料、订单物流、已售车辆与售后信息。B2B 下单继续使用授权外部渠道。', href: '/dealer', tag: '经销商', mark: '02' },
  { title: '我的 ALSVID', english: 'My ALSVID', audience: '已验证车主 / 客户', description: '以我的车辆为中心，查看车辆档案、保修、说明书、维修记录与适配配件。', href: '/my', tag: '车主服务', mark: '03' },
] as const;

function releaseLabel() {
  const sha = process.env.ALSVID_RELEASE_SHA;
  return sha && /^[0-9a-f]{40}$/i.test(sha) ? sha.slice(0, 8) : '未提供';
}

export default async function PortalLauncherPage() {
  const session = await readInternalPreviewSession();
  const isProduction = process.env.ALSVID_ENV === 'production';
  return (
    <PortalLoginGate authenticated={Boolean(session)}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.wordmark} href="/">ALSVID</Link>
          <div className={styles.headerRight}>
            <ThemeToggle />
            <span className={styles.environment}><i /> {isProduction ? 'ALSVID Production' : 'ALSVID Development'}</span>
            {session ? (
              <>
                <span className={styles.user}><b>◯</b><span>{session.displayName || 'ALSVID User'}<small>{session.email}</small></span></span>
                <Link className={styles.logout} href="/api/session/logout">退出</Link>
              </>
            ) : null}
          </div>
        </header>
        <section className={styles.intro}>
          <p className={styles.kicker}>ALSVID</p>
          <h1>ONE BRAND <small>THREE WORLDS</small></h1>
          <p className={styles.lead}>RIDE FURTHER · LIVE WIDER</p>
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
          <span>◉ <b>System</b><strong>运行状态尚未检测</strong></span>
          <span>▱ <b>Environment</b><strong>{isProduction ? 'Production' : 'Development'}</strong></span>
          <span>◇ <b>Version</b><strong>{releaseLabel()}</strong></span>
          <span>◷ <b>Data</b><strong>Real facts only</strong></span>
        </aside>
        <footer className={styles.footer}><span>ALSVID · RIDE FURTHER · LIVE WIDER</span><Link href="/admin">进入管理后台</Link></footer>
      </main>
    </PortalLoginGate>
  );
}
