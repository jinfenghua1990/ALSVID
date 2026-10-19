import { notFound } from 'next/navigation';
import { warrantyProgress, warrantyRemainingDays } from '../../../_data/garage';
import { getVehicle } from '../../../_data/garage-live';
import garage from '../../../garage.module.css';

export default async function VehicleWarrantyPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);

  if (!vehicle) notFound();

  return (
    <div className={garage.detailSplit}>
      <article className={garage.panel}>
        <h2>Warranty</h2>
        <p>{vehicle.model} · {vehicle.warranty.plan}</p>

        <div className={garage.warrantyHero}>
          <strong className={garage.bigNum}>{vehicle.warranty.end ? warrantyRemainingDays(vehicle) : '—'}</strong>
          <span className={garage.numLabel}>
            {vehicle.warranty.end ? (vehicle.warranty.active ? '剩余天数' : '保修已结束') : '保修资格待核验'} · 结束日期 {vehicle.warranty.end || '待核验'}
          </span>
        </div>

        <div className={garage.track}>
          <div className={garage.trackFill} style={{ width: `${warrantyProgress(vehicle)}%` }} />
        </div>

        <div className={garage.kv} style={{ marginTop: '22px' }}>
          <div className={garage.kvRow}><span>开始日期</span><strong>{vehicle.warranty.start || '待核验'}</strong></div>
          <div className={garage.kvRow}><span>结束日期</span><strong>{vehicle.warranty.end || '待核验'}</strong></div>
          <div className={garage.kvRow}><span>状态</span><strong>{vehicle.warranty.active ? '有效' : '待核验'}</strong></div>
        </div>
      </article>

      <aside className={garage.panel}>
        <h2>覆盖范围</h2>
        <p>保修条款与交付日期正在核验；以下仅展示已通过授权确认的覆盖项目。</p>
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
