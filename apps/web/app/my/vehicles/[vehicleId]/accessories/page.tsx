import { notFound } from 'next/navigation';
import { getVehicle } from '../../../_data/garage';
import styles from '../../../owner-portal.module.css';
import garage from '../../../garage.module.css';

export default async function VehicleAccessoriesPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);

  if (!vehicle) notFound();

  return (
    <article className={garage.block}>
      <h2>推荐配件</h2>
      <p>只推荐与 {vehicle.model} 兼容的配件。</p>

      <div className={garage.accessoryGrid} style={{ marginTop: '20px' }}>
        {vehicle.accessories.map((accessory) => (
          <div className={garage.accessoryCard} key={accessory.id}>
            <strong>{accessory.name}</strong>
            <p>{accessory.note}</p>
            <span className={`${garage.accessoryTag}${accessory.compatible ? '' : ` ${garage.accessoryTagMuted}`}`}>
              {accessory.compatible ? '兼容' : '不兼容'}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.notice} style={{ marginTop: '22px' }}>
        配件商城联动不在 V1 范围。当前展示兼容性标签与推荐结构。
      </div>
    </article>
  );
}
