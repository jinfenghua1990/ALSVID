import { notFound } from 'next/navigation';
import { getVehicle } from '../../../_data/garage-live';
import garage from '../../../garage.module.css';

const statusTone: Record<string, string> = {
  open: 'var(--alsvid-muted)',
  processing: 'var(--alsvid-warning)',
  done: 'var(--alsvid-success)',
};

export default async function VehicleRepairsPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);

  if (!vehicle) notFound();

  return (
    <article className={garage.panel}>
      <h2>Repair History</h2>
      <p>{vehicle.model} 的维修工单与处理状态。</p>

      {vehicle.repairs.length > 0 ? (
        <div className={garage.timeline}>
          {vehicle.repairs.map((repair) => (
            <div className={garage.timelineItem} key={repair.id}>
              <span className={garage.timelineDate}>{repair.code}</span>
              <div className={garage.timelineBody}>
                <strong>{repair.issue}</strong>
                <p>处理状态：{repair.statusLabel}</p>
                <div className={garage.timelineMeta}>
                  提交 {repair.openedAt}
                  {repair.completedAt ? ` · 完成 ${repair.completedAt}` : ' · 尚未完成'}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: statusTone[repair.status],
                  }}
                  aria-hidden="true"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={garage.emptyBlock}>这台车没有维修记录。</div>
      )}
    </article>
  );
}
