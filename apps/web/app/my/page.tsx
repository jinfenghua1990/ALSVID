import Link from 'next/link';
import { requirePortalSession } from '../_lib/portal-access';
import { OwnerShell } from '../_components/owner-shell';
import { BikeVisual } from './_components/bike-visual';
import { getOwnerGarage, latestService, warrantyRemainingDays } from './_data/garage';
import styles from './owner-portal.module.css';
import garage from './garage.module.css';

const quickLinks = [
  ['保修', '⛨', 'warranty'],
  ['服务记录', '≡', 'service'],
  ['维修', '✦', 'repairs'],
  ['说明书', '▤', 'manual'],
  ['配件', '+', 'accessories'],
] as const;

function statusDotClass(status: string) {
  if (status === 'attention') return garage.statusDotWarn;
  if (status === 'in_service') return garage.statusDotBusy;
  return garage.statusDot;
}

export default async function MyALSVIDPage() {
  await requirePortalSession('my', '/my');

  const { ownerName, updatedAt, vehicles } = await getOwnerGarage();
  const primary = vehicles[0] ?? null;
  const others = vehicles.slice(1);

  return (
    <OwnerShell activeHref="/my">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>MY ALSVID · OWNER CENTER</p>
          <h1>欢迎回来，{ownerName}。</h1>
          <p>My ALSVID 围绕 Vehicle / VIN 保存你的车辆身份、保修、服务历史和售后关系。它不是商城账户，而是每一台 ALSVID 的长期数字档案。</p>
        </header>

        {primary ? (
          <>
            <section className={garage.heroVehicle}>
              <div className={garage.heroTop}>
                <div>
                  <p className={styles.eyebrow}>YOUR VEHICLE</p>
                  <h2 className={garage.heroTitle}>{primary.model}</h2>
                  <p className={garage.heroSub}>{primary.variant} · {primary.colorway}</p>
                </div>
                <span className={garage.statusPill}>
                  <span className={statusDotClass(primary.status)} aria-hidden="true" />
                  车辆状态 · {primary.statusLabel}
                </span>
              </div>

              <div className={garage.heroVisual}>
                <BikeVisual tone={primary.tone} label={primary.model} />
              </div>

              <div className={garage.vinRow}>
                <div>VIN<strong>{primary.vin}</strong></div>
                <div>车架号<strong>{primary.frameNumber}</strong></div>
                <div>购买日期<strong>{primary.purchaseDate}</strong></div>
                <div>保修剩余<strong>{warrantyRemainingDays(primary)} 天</strong></div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><h2>快捷入口</h2><p>所有服务都以具体车辆为入口。</p></div>
                <Link className={styles.secondaryAction} href={`/my/vehicles/${primary.id}`}>查看车辆详情</Link>
              </div>
              <div className={garage.quickRow}>
                {quickLinks.map(([title, icon, section]) => (
                  <Link className={garage.quickTile} href={`/my/vehicles/${primary.id}/${section}`} key={title}>
                    <span aria-hidden="true">{icon}</span>
                    <strong>{title}</strong>
                  </Link>
                ))}
                <Link className={garage.quickTile} href="/my/service/new">
                  <span aria-hidden="true">↗</span>
                  <strong>售后申请</strong>
                </Link>
              </div>
            </section>
          </>
        ) : (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div><h2>我的车辆</h2><p>车辆绑定后，保修、服务和资料都会自动围绕这台车展开。</p></div>
              <Link className={styles.primaryAction} href="/my/vehicles/register">+ 添加车辆</Link>
            </div>

            <article className={styles.garageCard}>
              <div className={styles.vehicleVisual}>
                <BikeVisual tone="blue" label="ALSVID bicycle outline" />
              </div>
              <div className={styles.emptyCopy}>
                <small>YOUR GARAGE</small>
                <h3>车库还是空的。</h3>
                <p>绑定你的第一台 ALSVID。我们只会在车辆身份与所有权关系确认后，把车辆加入你的车库。</p>
                <Link className={styles.secondaryAction} href="/my/vehicles/register">使用 VIN / 车架号绑定</Link>
              </div>
            </article>
          </section>
        )}

        {others.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div><h2>车库中的其他车辆</h2><p>共 {vehicles.length} 台已确认的 ALSVID 车辆。</p></div>
              <Link className={styles.secondaryAction} href="/my/vehicles">全部车辆</Link>
            </div>
            <div className={garage.vehicleGrid}>
              {others.map((vehicle) => (
                <Link className={garage.vehicleCard} href={`/my/vehicles/${vehicle.id}`} key={vehicle.id}>
                  <div className={garage.vehicleCardVisual}>
                    <BikeVisual tone={vehicle.tone} label={vehicle.model} />
                  </div>
                  <div className={garage.vehicleCardBody}>
                    <div>
                      <h3>{vehicle.model}</h3>
                      <p>{vehicle.variant}</p>
                    </div>
                    <div className={garage.specRows}>
                      <div className={garage.specRow}><span>VIN</span><strong>{vehicle.vin}</strong></div>
                      <div className={garage.specRow}><span>保修</span><strong>{vehicle.warranty.active ? '有效' : '已过期'}</strong></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.splitGrid}>
          <article className={styles.panel}>
            <h3>最近动态</h3>
            <p>交付、保修激活、服务和维修完成后，会在这里形成车辆生命周期时间线。</p>
            {primary ? (
              <div className={garage.timeline}>
                {primary.services.slice(0, 3).map((record) => (
                  <div className={garage.timelineItem} key={record.id}>
                    <span className={garage.timelineDate}>{record.date}</span>
                    <div className={garage.timelineBody}>
                      <strong>{record.title}</strong>
                      <p>{record.detail}</p>
                      <div className={garage.timelineMeta}>{record.location}</div>
                    </div>
                  </div>
                ))}
                {primary.services.length === 0 ? <div className={garage.emptyBlock}>暂无车辆动态。</div> : null}
              </div>
            ) : (
              <div className={styles.emptyList}>绑定车辆后显示真实车辆动态。</div>
            )}
          </article>

          <article className={styles.panel}>
            <h3>车主状态</h3>
            <p>账户身份与车辆所有权保持独立，不会因为知道 VIN 自动获得车辆权限。</p>
            <div className={styles.statusList}>
              <div className={styles.statusRow}><span>账户</span><strong>已登录</strong></div>
              <div className={styles.statusRow}><span>车辆</span><strong>{vehicles.length > 0 ? `${vehicles.length} 台` : '尚未绑定'}</strong></div>
              <div className={styles.statusRow}>
                <span>最近服务</span>
                <strong>{primary && latestService(primary) ? latestService(primary)!.date : '暂无'}</strong>
              </div>
              <div className={styles.statusRow}><span>数据更新</span><strong>{updatedAt}</strong></div>
            </div>
          </article>
        </section>

        <div className={garage.previewNotice}>
          当前展示为 UI 预览数据，用于页面评审。车辆识别与所有权核验接口接入后，这里只会显示通过核验的真实车辆。
        </div>
      </div>
    </OwnerShell>
  );
}
