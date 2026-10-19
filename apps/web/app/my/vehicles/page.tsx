import Link from 'next/link';
import { requirePortalSession } from '../../_lib/portal-access';
import { OwnerShell } from '../../_components/owner-shell';
import { BikeVisual } from '../_components/bike-visual';
import { latestService, warrantyRemainingDays } from '../_data/garage';
import { getOwnerGarage } from '../_data/garage-live';
import styles from '../owner-portal.module.css';
import garage from '../garage.module.css';

export default async function MyVehiclesPage() {
  await requirePortalSession('my', '/my/vehicles');

  const { vehicles } = await getOwnerGarage();

  return (
    <OwnerShell activeHref="/my/vehicles">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>MY ALSVID / VEHICLES</p>
          <h1>我的车辆</h1>
          <p>一台车对应一个长期数字档案。VIN、所有权、保修、维修、售后和资料都从这里关联。</p>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>你的车库</h2>
              <p>{vehicles.length > 0 ? `共 ${vehicles.length} 台已确认的 ALSVID 车辆。` : '当前没有已确认的 ALSVID 车辆。'}</p>
            </div>
            <Link className={styles.primaryAction} href="/my/vehicles/register">+ 添加车辆</Link>
          </div>

          {vehicles.length > 0 ? (
            <div className={garage.vehicleGrid}>
              {vehicles.map((vehicle) => {
                const service = latestService(vehicle);
                return (
                  <Link className={garage.vehicleCard} href={`/my/vehicles/${vehicle.id}`} key={vehicle.id}>
                    <div className={garage.cardStage}>
                      <BikeVisual tone={vehicle.tone} image={vehicle.image} label={vehicle.model} />
                    </div>
                    <div className={garage.vehicleCardBody}>
                      <div>
                        <h3>{vehicle.model}</h3>
                        <p>{vehicle.variant} · {vehicle.colorway}</p>
                      </div>
                      <div className={garage.kv}>
                        <div className={garage.kvRow}><span>VIN</span><strong>{vehicle.vin}</strong></div>
                        <div className={garage.kvRow}><span>购买日期</span><strong>{vehicle.purchaseDate}</strong></div>
                        <div className={garage.kvRow}>
                          <span>保修状态</span>
                          <strong>{vehicle.warranty.active ? `有效 · 剩 ${warrantyRemainingDays(vehicle)} 天` : '已过期'}</strong>
                        </div>
                        <div className={garage.kvRow}>
                          <span>服务状态</span>
                          <strong>{service ? `最近 ${service.date}` : '暂无记录'}</strong>
                        </div>
                        <div className={garage.kvRow}><span>车辆状态</span><strong>{vehicle.statusLabel}</strong></div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <article className={styles.card}>
              <div className={styles.emptyList}>车辆绑定并通过所有权核验后，会在这里显示车型、VIN、保修和服务入口。</div>
            </article>
          )}
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.card}>
            <h2>购买后如何进入车库</h2>
            <p>订单完成 → 获得 Frame Number / VIN → 登录 My ALSVID → 绑定车辆 → 进入车库。</p>
          </article>

          <aside className={styles.card}>
            <h2>车辆如何进入车库</h2>
            <p>绑定动作不会绕过所有权校验。</p>
            <div className={styles.steps}>
              <div className={styles.step}><span className={styles.stepIndex}>1</span><div><strong>识别车辆</strong><p>输入 VIN / 车架号，匹配 ALSVID 车辆身份。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>2</span><div><strong>核验关系</strong><p>结合交付、购买或审核事实确认车辆与你的关系。</p></div></div>
              <div className={styles.step}><span className={styles.stepIndex}>3</span><div><strong>建立档案</strong><p>确认后开放保修、历史、售后、资料与配件。</p></div></div>
            </div>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
