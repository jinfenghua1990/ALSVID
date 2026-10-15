/**
 * My ALSVID garage data contract (UI preview layer).
 *
 * These fixtures exist so the owner-facing pages can be reviewed end to end
 * before the vehicle domain endpoints are wired. They are NOT business data:
 * replace `getOwnerGarage` / `getVehicle` with the domain facade once the
 * vehicle ownership ports land. Page structure and exported types stay unchanged.
 */

export type VehicleTone = 'blue' | 'graphite' | 'sand';

export type VehicleStatus = 'normal' | 'attention' | 'in_service';

export type ServiceRecord = {
  id: string;
  date: string;
  title: string;
  detail: string;
  location: string;
};

export type RepairRecord = {
  id: string;
  code: string;
  issue: string;
  status: 'open' | 'processing' | 'done';
  statusLabel: string;
  openedAt: string;
  completedAt: string | null;
};

export type VehicleDocument = {
  id: string;
  title: string;
  kind: string;
  size: string;
  updatedAt: string;
};

export type Accessory = {
  id: string;
  name: string;
  note: string;
  compatible: boolean;
};

export type OwnerVehicle = {
  id: string;
  model: string;
  variant: string;
  colorway: string;
  tone: VehicleTone;
  vin: string;
  frameNumber: string;
  purchaseDate: string;
  deliveryDate: string;
  dealer: string;
  status: VehicleStatus;
  statusLabel: string;
  warranty: {
    plan: string;
    start: string;
    end: string;
    active: boolean;
    coverage: string[];
  };
  services: ServiceRecord[];
  repairs: RepairRecord[];
  documents: VehicleDocument[];
  accessories: Accessory[];
};

export type OwnerGarage = {
  ownerName: string;
  updatedAt: string;
  vehicles: OwnerVehicle[];
};

const vehicles: OwnerVehicle[] = [
  {
    id: 'fc1-pro',
    model: 'FC1 Pro',
    variant: 'FC1 Pro / 2026',
    colorway: 'Deep Blue',
    tone: 'blue',
    vin: 'ALSFC1P26X000417',
    frameNumber: 'FC1-2026-0417',
    purchaseDate: '2026-03-18',
    deliveryDate: '2026-03-26',
    dealer: 'ALSVID 中国香港旗舰店',
    status: 'normal',
    statusLabel: '正常',
    warranty: {
      plan: '整车保修',
      start: '2026-03-26',
      end: '2029-03-26',
      active: true,
      coverage: ['车架与刚性结构', '电机与电控系统', '电池组容量衰减'],
    },
    services: [
      {
        id: 'svc-1',
        date: '2026-09-12',
        title: '定期保养',
        detail: '更换刹车片、链条张力校准、固件检查。',
        location: 'ALSVID Dealer',
      },
      {
        id: 'svc-2',
        date: '2026-06-04',
        title: '首次检查',
        detail: '交付后 500km 复检，扭矩与变速复查。',
        location: 'ALSVID Dealer',
      },
    ],
    repairs: [],
    documents: [
      { id: 'doc-1', title: '用户手册', kind: 'PDF', size: '4.2 MB', updatedAt: '2026-03-20' },
      { id: 'doc-2', title: '快速开始指南', kind: 'PDF', size: '1.1 MB', updatedAt: '2026-03-20' },
      { id: 'doc-3', title: '维护指南', kind: 'PDF', size: '2.6 MB', updatedAt: '2026-05-08' },
    ],
    accessories: [
      { id: 'acc-1', name: '挡泥板', note: 'FC1 Pro 专用', compatible: true },
      { id: 'acc-2', name: '前车灯', note: '兼容全系', compatible: true },
      { id: 'acc-3', name: '维修工具组', note: '含扭矩扳手', compatible: true },
    ],
  },
  {
    id: 'gt1',
    model: 'GT1',
    variant: 'GT1 / 2025',
    colorway: 'Graphite',
    tone: 'graphite',
    vin: 'ALSGT1P25X000092',
    frameNumber: 'GT1-2025-0092',
    purchaseDate: '2025-11-02',
    deliveryDate: '2025-11-15',
    dealer: 'ALSVID Dealer · Berlin',
    status: 'attention',
    statusLabel: '需关注',
    warranty: {
      plan: '整车保修',
      start: '2025-11-15',
      end: '2028-11-15',
      active: true,
      coverage: ['车架与刚性结构', '变速与传动系统'],
    },
    services: [
      {
        id: 'svc-3',
        date: '2026-04-21',
        title: '年度保养',
        detail: '变速调校、轮组校正、刹车系统检查。',
        location: 'ALSVID Dealer · Berlin',
      },
    ],
    repairs: [
      {
        id: 'rep-1',
        code: 'R-2026-0412',
        issue: '后拨链器异响',
        status: 'processing',
        statusLabel: '处理中',
        openedAt: '2026-10-04',
        completedAt: null,
      },
    ],
    documents: [
      { id: 'doc-4', title: '用户手册', kind: 'PDF', size: '3.8 MB', updatedAt: '2025-10-30' },
      { id: 'doc-5', title: '软件下载', kind: 'LINK', size: '—', updatedAt: '2026-02-11' },
    ],
    accessories: [
      { id: 'acc-4', name: '升级组件', note: 'GT1 传动升级包', compatible: true },
      { id: 'acc-5', name: '车灯', note: '不兼容 GT1 前叉', compatible: false },
    ],
  },
  {
    id: 'ct',
    model: 'CT',
    variant: 'CT / 2025',
    colorway: 'Sand',
    tone: 'sand',
    vin: 'ALSCT2025X000311',
    frameNumber: 'CT-2025-0311',
    purchaseDate: '2025-06-09',
    deliveryDate: '2025-06-20',
    dealer: 'ALSVID 官方商城',
    status: 'normal',
    statusLabel: '正常',
    warranty: {
      plan: '整车保修',
      start: '2025-06-20',
      end: '2028-06-20',
      active: true,
      coverage: ['车架与刚性结构'],
    },
    services: [],
    repairs: [],
    documents: [{ id: 'doc-6', title: '用户手册', kind: 'PDF', size: '3.1 MB', updatedAt: '2025-06-01' }],
    accessories: [{ id: 'acc-6', name: '挡泥板', note: 'CT 专用', compatible: true }],
  },
];

const garage: OwnerGarage = {
  ownerName: 'Gino',
  updatedAt: '2026-10-14 09:20',
  vehicles,
};

export async function getOwnerGarage(): Promise<OwnerGarage> {
  return garage;
}

export async function getVehicle(vehicleId: string): Promise<OwnerVehicle | null> {
  return vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
}

export function warrantyRemainingDays(vehicle: OwnerVehicle, now = new Date()): number {
  const end = new Date(`${vehicle.warranty.end}T00:00:00Z`).getTime();
  return Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000));
}

export function warrantyProgress(vehicle: OwnerVehicle, now = new Date()): number {
  const start = new Date(`${vehicle.warranty.start}T00:00:00Z`).getTime();
  const end = new Date(`${vehicle.warranty.end}T00:00:00Z`).getTime();
  const total = end - start;
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function latestService(vehicle: OwnerVehicle): ServiceRecord | null {
  return vehicle.services[0] ?? null;
}
