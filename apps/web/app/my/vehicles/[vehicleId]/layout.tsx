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

  return (
    <OwnerShell activeHref={`/my/vehicles/${vehicle.id}`}>
      <div className={styles.page}>
        <header className={garage.vehicleHeader}>
          <p className={styles.eyebrow}>
            <Link href="/my/vehicles">我的车辆</Link> · VEHICLE DETAIL
          </p>

          <section className={garage.heroVehicle}>
            <div className={garage.heroTop}>
              <div>
                <h1 className={garage.heroTitle}>{vehicle.model}</h1>
                <p className={garage.heroSub}>{vehicle.variant} · {vehicle.colorway}</p>
              </div>
              <span className={garage.statusPill}>
                <span
                  className={`${garage.statusDot}${vehicle.status === 'attention' ? ` ${garage.statusDotWarn}` : ''}${vehicle.status === 'in_service' ? ` ${garage.statusDotBusy}` : ''}`}
                  aria-hidden="true"
                />
                车辆状态 · {vehicle.statusLabel}
              </span>
            </div>

            <div className={garage.heroVisual}>
              <BikeVisual tone={vehicle.tone} label={vehicle.model} />
            </div>

            <div className={garage.vinRow}>
              <div>VIN<strong>{vehicle.vin}</strong></div>
              <div>车架号<strong>{vehicle.frameNumber}</strong></div>
              <div>购买日期<strong>{vehicle.purchaseDate}</strong></div>
              <div>交付方<strong>{vehicle.dealer}</strong></div>
            </div>
          </section>

          <VehicleTabs vehicleId={vehicle.id} />
        </header>

        {children}
      </div>
    </OwnerShell>
  );
}
