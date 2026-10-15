import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVehicle, latestService, warrantyProgress, warrantyRemainingDays } from '../../_data/garage';
import styles from '../../owner-portal.module.css';
import garage from '../../garage.module.css';

export default async function VehicleOverviewPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);

  if (!vehicle) notFound();

  const service = latestService(vehicle);

  return (
    <div className={garage.detailSplit}>
      <article className={garage.panel}>
        <h2>车辆概览</h2>
        <p>车辆身份与交付信息，来自 ALSVID 唯一的 Vehicle Object。</p>
        <div className={garage.kv}>
          <div className={garage.kvRow}><span>车型</span><strong>{vehicle.model}</strong></div>
          <div className={garage.kvRow}><span>版本</span><strong>{vehicle.variant}</strong></div>
          <div className={garage.kvRow}><span>VIN</span><strong>{vehicle.vin}</strong></div>
          <div className={garage.kvRow}><span>Frame Number</span><strong>{vehicle.frameNumber}</strong></div>
          <div className={garage.kvRow}><span>购买时间</span><strong>{vehicle.purchaseDate}</strong></div>
          <div className={garage.kvRow}><span>交付时间</span><strong>{vehicle.deliveryDate}</strong></div>
          <div className={garage.kvRow}><span>交付方</span><strong>{vehicle.dealer}</strong></div>
          <div className={garage.kvRow}><span>当前状态</span><strong>{vehicle.statusLabel}</strong></div>
        </div>
      </article>

      <aside style={{ display: 'grid', gap: '16px' }}>
        <article className={garage.panel}>
          <h2>保修</h2>
          <p>{vehicle.warranty.plan}</p>
          <div className={garage.warrantyHero}>
            <strong className={garage.bigNum}>{warrantyRemainingDays(vehicle)}</strong>
            <span className={garage.numLabel}>剩余天数 · 至 {vehicle.warranty.end}</span>
          </div>
          <div className={garage.track}>
            <div className={garage.trackFill} style={{ width: `${warrantyProgress(vehicle)}%` }} />
          </div>
          <Link className={styles.secondaryAction} href={`/my/vehicles/${vehicle.id}/warranty`} style={{ marginTop: '18px' }}>
            查看保修详情
          </Link>
        </article>

        <article className={garage.panel}>
          <h2>最近服务</h2>
          {service ? (
            <>
              <p>{service.date} · {service.title}</p>
              <div className={garage.timelineBody} style={{ marginTop: '14px' }}>
                <strong>{service.location}</strong>
                <p>{service.detail}</p>
              </div>
            </>
          ) : (
            <div className={garage.emptyBlock}>这台车还没有服务记录。</div>
          )}
          <Link className={styles.secondaryAction} href={`/my/vehicles/${vehicle.id}/service`} style={{ marginTop: '18px' }}>
            全部服务记录
          </Link>
        </article>

        <Link className={styles.primaryAction} href={`/my/service/new?vehicle=${vehicle.id}`}>
          提交售后申请
        </Link>
      </aside>
    </div>
  );
}
