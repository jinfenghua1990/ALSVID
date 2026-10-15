import { notFound } from 'next/navigation';
import { getVehicle, warrantyProgress, warrantyRemainingDays } from '../../../_data/garage';
import garage from '../../../garage.module.css';

export default async function VehicleWarrantyPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);

  if (!vehicle) notFound();

  return (
    <div className={garage.detailGrid}>
      <article className={garage.block}>
        <h2>Warranty</h2>
        <p>{vehicle.model} · {vehicle.warranty.plan}</p>

        <div className={garage.warrantyHero}>
          <strong className={garage.warrantyDays}>{warrantyRemainingDays(vehicle)}</strong>
          <span className={garage.warrantyDaysLabel}>
            {vehicle.warranty.active ? '剩余天数' : '保修已结束'} · 结束日期 {vehicle.warranty.end}
          </span>
        </div>

        <div className={garage.warrantyBar}>
          <div className={garage.warrantyBarFill} style={{ width: `${warrantyProgress(vehicle)}%` }} />
        </div>

        <div className={garage.specRows} style={{ marginTop: '22px' }}>
          <div className={garage.specRow}><span>开始日期</span><strong>{vehicle.warranty.start}</strong></div>
          <div className={garage.specRow}><span>结束日期</span><strong>{vehicle.warranty.end}</strong></div>
          <div className={garage.specRow}><span>状态</span><strong>{vehicle.warranty.active ? '有效' : '已过期'}</strong></div>
        </div>
      </article>

      <aside className={garage.block}>
        <h2>覆盖范围</h2>
        <p>以交付日期起算，仅覆盖下列项目。</p>
        <div className={garage.timeline}>
          {vehicle.warranty.coverage.map((item) => (
            <div className={garage.timelineItem} key={item}>
              <span className={garage.timelineDate}>COVERED</span>
              <div className={garage.timelineBody}><strong>{item}</strong></div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
