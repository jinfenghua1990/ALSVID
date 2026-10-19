import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVehicle } from '../../../_data/garage-live';
import styles from '../../../owner-portal.module.css';
import garage from '../../../garage.module.css';

export default async function VehicleServicePage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);

  if (!vehicle) notFound();

  return (
    <article className={garage.panel}>
      <h2>Service History</h2>
      <p>{vehicle.model} 的全部保养与检查记录。</p>

      {vehicle.services.length > 0 ? (
        <div className={garage.timeline}>
          {vehicle.services.map((record) => (
            <div className={garage.timelineItem} key={record.id}>
              <span className={garage.timelineDate}>{record.date}</span>
              <div className={garage.timelineBody}>
                <strong>{record.title}</strong>
                <p>{record.detail}</p>
                <div className={garage.timelineMeta}>服务地点：{record.location}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={garage.emptyBlock}>这台车还没有服务记录。</div>
      )}

      <Link className={styles.secondaryAction} href={`/my/service/new?vehicle=${vehicle.id}`} style={{ marginTop: '22px' }}>
        预约 / 申请服务
      </Link>
    </article>
  );
}
