/** Pure My ALSVID UI types and helpers. Real data is loaded server-side in garage-live.ts. No sample owner/vehicle facts in live portals. */

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
  image?: string;
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


export function warrantyRemainingDays(vehicle: OwnerVehicle, now = new Date()): number {
  const end = new Date(`${vehicle.warranty.end}T00:00:00Z`).getTime();
  return Number.isFinite(end) ? Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000)) : 0;
}

export function warrantyProgress(vehicle: OwnerVehicle, now = new Date()): number {
  const start = new Date(`${vehicle.warranty.start}T00:00:00Z`).getTime();
  const end = new Date(`${vehicle.warranty.end}T00:00:00Z`).getTime();
  const total = end - start;
  if (!Number.isFinite(total) || total <= 0) return 0;
  const elapsed = now.getTime() - start;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function latestService(vehicle: OwnerVehicle): ServiceRecord | null {
  return vehicle.services[0] ?? null;
}
