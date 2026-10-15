import { notFound } from 'next/navigation';
import { getVehicle } from '../../../_data/garage';
import styles from '../../../owner-portal.module.css';
import garage from '../../../garage.module.css';

export default async function VehicleManualPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const vehicle = await getVehicle(vehicleId);

  if (!vehicle) notFound();

  return (
    <article className={garage.block}>
      <h2>用户手册与文件</h2>
      <p>按 {vehicle.model} 自动匹配版本资料。</p>

      <div style={{ marginTop: '18px' }}>
        {vehicle.documents.map((doc) => (
          <div className={garage.docRow} key={doc.id}>
            <div>
              <strong>{doc.title}</strong>
              <small>{doc.kind} · {doc.size} · 更新于 {doc.updatedAt}</small>
            </div>
            <button className={garage.docAction} type="button" disabled>
              下载
            </button>
          </div>
        ))}
      </div>

      <div className={styles.notice} style={{ marginTop: '22px' }}>
        文件下载将在对象存储与文档权限就绪后开放。当前先完成 UI 结构。
      </div>
    </article>
  );
}
