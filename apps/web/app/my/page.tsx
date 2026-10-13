import Link from 'next/link';
import { requirePortalSession } from '../_lib/portal-access';
import { OwnerShell } from '../_components/owner-shell';
import styles from './owner-portal.module.css';

function BikeOutline() {
  return (
    <svg className={styles.bikeIcon} viewBox="0 0 720 320" role="img" aria-label="ALSVID bicycle outline">
      <g fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="150" cy="225" r="78" />
        <circle cx="565" cy="225" r="78" />
        <path d="M150 225 270 100l95 125H150l80-125h82" />
        <path d="M365 225 490 92h54" />
        <path d="M515 92 565 225" />
        <path d="M255 88h64" />
        <path d="M483 80h82" />
      </g>
    </svg>
  );
}

const quickLinks = [
  ['保修', '查看当前车辆保修状态', '/my/service', '✓'],
  ['售后', '提交并追踪服务申请', '/my/service/new', '↗'],
  ['用户手册', '匹配车辆版本的使用资料', '/my/library#help', '≡'],
  ['配件', '只推荐与你车辆兼容的配件', '/my/library#accessories', '+'],
] as const;

export default async function MyALSVIDPage() {
  await requirePortalSession('my', '/my');

  return (
    <OwnerShell activeHref="/my">
      <div className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>MY ALSVID · OWNER CENTER</p>
          <h1>你的车，从这里开始。</h1>
          <p>My ALSVID 围绕 Vehicle / VIN 保存你的车辆身份、保修、服务历史和售后关系。它不是商城账户，而是每一台 ALSVID 的长期数字档案。</p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><h2>我的车辆</h2><p>车辆绑定后，保修、服务和资料都会自动围绕这台车展开。</p></div>
            <Link className={styles.primaryAction} href="/my/vehicles/register">+ 添加车辆</Link>
          </div>

          <article className={styles.garageCard}>
            <div className={styles.vehicleVisual}><BikeOutline /></div>
            <div className={styles.emptyCopy}>
              <small>YOUR GARAGE</small>
              <h3>车库还是空的。</h3>
              <p>绑定你的第一台 ALSVID。我们只会在车辆身份与所有权关系确认后，把车辆加入你的车库。</p>
              <Link className={styles.secondaryAction} href="/my/vehicles/register">使用 VIN / 车架号绑定</Link>
            </div>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><h2>快捷服务</h2><p>所有服务都以具体车辆为入口。</p></div></div>
          <div className={styles.quickGrid}>
            {quickLinks.map(([title, detail, href, icon]) => (
              <Link className={styles.quickCard} href={href} key={title}>
                <span>{icon}</span>
                <span><strong>{title}</strong><small>{detail}</small></span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.splitGrid}>
          <article className={styles.panel}>
            <h3>最近动态</h3>
            <p>交付、保修激活、服务和维修完成后，会在这里形成车辆生命周期时间线。</p>
            <div className={styles.emptyList}>绑定车辆后显示真实车辆动态。</div>
          </article>
          <article className={styles.panel}>
            <h3>车主状态</h3>
            <p>账户身份与车辆所有权保持独立，不会因为知道 VIN 自动获得车辆权限。</p>
            <div className={styles.statusList}>
              <div className={styles.statusRow}><span>账户</span><strong>已登录</strong></div>
              <div className={styles.statusRow}><span>车辆</span><strong>尚未绑定</strong></div>
              <div className={styles.statusRow}><span>服务记录</span><strong>暂无</strong></div>
            </div>
          </article>
        </section>
      </div>
    </OwnerShell>
  );
}
