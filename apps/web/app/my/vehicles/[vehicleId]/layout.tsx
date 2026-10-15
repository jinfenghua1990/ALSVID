import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { requirePortalSession } from '../../../_lib/portal-access';
import { OwnerShell } from '../../../_components/owner-shell';
import { BikeVisual } from '../../_components/bike-visual';
import { getVehicle } from '../../_data/garage';
import { VehicleTabs } from './_components/vehicle-tabs';
import styles from '../../owner-portal.module.css';
import garage from '../../garage.module.css';

export default async function VehicleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  await requirePortalSession('my', `/my/vehicles/${vehicleId}`);

  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) notFound();

  const statusClass =
    vehicle.status === 'attention'
      ? `${garage.statusDot} ${garage.statusDotWarn}`
      : vehicle.status === 'in_service'
        ? `${garage.statusDot} ${garage.statusDotBusy}`
        : garage.statusDot;

  return (
    <OwnerShell activeHref={`/my/vehicles/${vehicle.id}`}>
      <div className={styles.page}>
        <header className={garage.vehicleHeader}>
          <p className={garage.crumb}>
            <Link href="/my/vehicles">我的车辆</Link> · Vehicle detail
          </p>

          <section className={garage.hero}>
            <div className={garage.heroTop}>
              <div>
                <p className={styles.eyebrow}>Your vehicle</p>
                <h1 className={garage.heroTitle}>{vehicle.model}</h1>
                <p className={garage.heroSub}>{vehicle.variant} · {vehicle.colorway}</p>
              </div>
              <span className={garage.statusPill}>
                <span className={statusClass} aria-hidden="true" />
                车辆状态 · {vehicle.statusLabel}
              </span>
            </div>

            <div className={garage.stage}>
              <BikeVisual tone={vehicle.tone} image={vehicle.image} label={vehicle.model} />
            </div>

            <div className={garage.specBar}>
              <div className={garage.specCell}>
                <span>Vin</span>
                <strong>{vehicle.vin}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Frame</span>
                <strong>{vehicle.frameNumber}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Purchased</span>
                <strong>{vehicle.purchaseDate}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Delivered by</span>
                <strong>{vehicle.dealer}</strong>
              </div>
            </div>
          </section>

          <VehicleTabs vehicleId={vehicle.id} />
        </header>

        {children}
      </div>
    </OwnerShell>
  );
}
