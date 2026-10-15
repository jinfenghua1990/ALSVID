'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import garage from '../../../garage.module.css';

const tabs = [
  { label: '概览', segment: '' },
  { label: '保修', segment: 'warranty' },
  { label: '服务记录', segment: 'service' },
  { label: '维修', segment: 'repairs' },
  { label: '说明书', segment: 'manual' },
  { label: '配件', segment: 'accessories' },
] as const;

export function VehicleTabs({ vehicleId }: { vehicleId: string }) {
  const pathname = usePathname();
  const base = `/my/vehicles/${vehicleId}`;

  return (
    <nav className={garage.tabs} aria-label="车辆详情导航">
      {tabs.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = pathname === href;
        return (
          <Link
            className={`${garage.tab}${active ? ` ${garage.tabActive}` : ''}`}
            href={href}
            key={tab.label}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
