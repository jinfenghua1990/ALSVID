import Link from 'next/link';
import { requirePortalSession } from '../_lib/portal-access';
import { OwnerShell } from '../_components/owner-shell';
import { BikeVisual } from './_components/bike-visual';
import { getOwnerGarage, latestService, warrantyRemainingDays } from './_data/garage';
import styles from './owner-portal.module.css';
import garage from './garage.module.css';

const quickLinks = [
  ['保修', '⛨', 'warranty', '查看保修范围与剩余天数'],
  ['服务记录', '≡', 'service', '保养与检查的完整时间线'],
  ['维修', '✦', 'repairs', '维修工单与处理状态'],
  ['说明书', '▤', 'manual', '按车型匹配的手册与文件'],
  ['配件', '＋', 'accessories', '只推荐兼容这台车的配件'],
] as const;

function statusDotClass(status: string) {
  if (status === 'attention') return garage.statusDotWarn;
  if (status === 'in_service') return garage.statusDotBusy;
  return garage.statusDot;
}

export default async function MyALSVIDPage() {
  const session = await requirePortalSession('my', '/my');

  const { ownerName, updatedAt, vehicles } = await getOwnerGarage();
  const primary = vehicles[0] ?? null;
  const others = vehicles.slice(1);

  return (
    <OwnerShell activeHref="/my">
      <div className={styles.page}>
        <header>
          <p className={styles.eyebrow}>My ALSVID · Owner center</p>
          <h1 className={styles.display} style={{ marginTop: 18 }}>欢迎回来，{session.displayName}。</h1>
          <p className={styles.lede}>你的 ALSVID 车辆身份、保修、服务与售后，全部围绕一个 VIN 长期保存。</p>
        </header>

        {primary ? (
          <section className={garage.hero}>
            <div className={garage.heroTop}>
              <div>
                <p className={styles.eyebrow}>Your vehicle</p>
                <h2 className={garage.heroTitle}>{primary.model}</h2>
                <p className={garage.heroSub}>{primary.variant} · {primary.colorway}</p>
              </div>
              <span className={garage.statusPill}>
                <span className={statusDotClass(primary.status)} aria-hidden="true" />
                车辆状态 · {primary.statusLabel}
              </span>
            </div>

            <div className={garage.stage}>
              <BikeVisual tone={primary.tone} image={primary.image} label={primary.model} />
            </div>

            <div className={garage.specBar}>
              <div className={garage.specCell}>
                <span>Vin</span>
                <strong>{primary.vin}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Frame</span>
                <strong>{primary.frameNumber}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Purchased</span>
                <strong>{primary.purchaseDate}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Warranty</span>
                <strong>{warrantyRemainingDays(primary)} 天</strong>
              </div>
            </div>
          </section>
        ) : (
          <section className={garage.hero}>
            <div className={garage.heroTop}>
              <div>
                <p className={styles.eyebrow}>Your garage</p>
                <h2 className={garage.heroTitle}>车库还是空的</h2>
                <p className={garage.heroSub}>绑定你的第一台 ALSVID。</p>
              </div>
            </div>
            <div className={garage.stage}>
              <BikeVisual tone="blue" label="ALSVID bicycle outline" />
            </div>
            <div className={garage.specBar}>
              <div className={garage.specCell} style={{ gridColumn: '1 / -1' }}>
                <span>Notice</span>
                <strong>我们只会在车辆身份与所有权关系确认后，把车辆加入你的车库。</strong>
              </div>
            </div>
          </section>
        )}

        <section>
          <div className={garage.sectionHead}>
            <div>
              <h2 className={garage.sectionTitle}>快捷入口</h2>
              <p className={garage.sectionSubtle}>所有服务都以具体车辆为入口。</p>
            </div>
            <Link className={styles.secondaryAction} href={primary ? `/my/vehicles/${primary.id}` : '/my/vehicles'}>
              查看车辆详情
            </Link>
          </div>
          <div className={garage.tileGrid}>
            {quickLinks.map(([title, icon, section, note]) => (
              <Link
                className={garage.tile}
                href={primary ? `/my/vehicles/${primary.id}/${section}` : '/my/vehicles'}
                key={title}
              >
                <span className={garage.tileIcon} aria-hidden="true">{icon}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{note}</small>
                </span>
              </Link>
            ))}
            <Link className={`${garage.tile} ${garage.tileAccent}`} href="/my/service/new">
              <span className={garage.tileIcon} aria-hidden="true">↗</span>
              <span>
                <strong>售后申请</strong>
                <small>带上车辆 VIN 提交，无需重复填写。</small>
              </span>
            </Link>
          </div>
        </section>

        {others.length > 0 ? (
          <section>
            <div className={garage.sectionHead}>
              <div>
                <h2 className={garage.sectionTitle}>车库中的其他车辆</h2>
                <p className={garage.sectionSubtle}>共 {vehicles.length} 台已确认的 ALSVID 车辆。</p>
              </div>
              <Link className={styles.secondaryAction} href="/my/vehicles">全部车辆</Link>
            </div>
            <div className={garage.vehicleGrid}>
              {others.map((vehicle) => (
                <Link className={garage.vehicleCard} href={`/my/vehicles/${vehicle.id}`} key={vehicle.id}>
                  <div className={garage.cardStage}>
                    <BikeVisual tone={vehicle.tone} image={vehicle.image} label={vehicle.model} />
                  </div>
                  <div className={garage.cardBody}>
                    <div>
                      <h3>{vehicle.model}</h3>
                      <p className={garage.cardMeta}>{vehicle.variant} · {vehicle.colorway}</p>
                    </div>
                    <div className={garage.kv}>
                      <div className={garage.kvRow}><span>VIN</span><strong>{vehicle.vin}</strong></div>
                      <div className={garage.kvRow}>
                        <span>保修</span>
                        <strong>{vehicle.warranty.active ? `有效 · 剩 ${warrantyRemainingDays(vehicle)} 天` : '已过期'}</strong>
                      </div>
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
                {primary.services.length === 0 ? <div className={garage.empty}>这台车还没有动态。</div> : null}
              </div>
            ) : (
              <div className={styles.emptyList}>绑定车辆后显示真实车辆动态。</div>
            )}
          </article>

          <article className={styles.panel}>
            <h3>车主状态</h3>
            <p>账户身份与车辆所有权相互独立。</p>
            <div className={garage.kv}>
              <div className={garage.kvRow}><span>账户</span><strong>已登录</strong></div>
              <div className={garage.kvRow}>
                <span>车辆</span>
                <strong>{vehicles.length > 0 ? `${vehicles.length} 台` : '尚未绑定'}</strong>
              </div>
              <div className={garage.kvRow}>
                <span>最近服务</span>
                <strong>{primary && latestService(primary) ? latestService(primary)!.date : '暂无'}</strong>
              </div>
              <div className={garage.kvRow}><span>数据更新</span><strong>{updatedAt}</strong></div>
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
