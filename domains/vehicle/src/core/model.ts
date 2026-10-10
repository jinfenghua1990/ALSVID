export const VehicleCapability={
  Read:'vehicle.read',
  Birth:'vehicle.birth',
  Handover:'vehicle.handover',
  OwnershipWrite:'vehicle.ownership.write',
  GarageRead:'vehicle.garage.read',
} as const;

export interface VehicleHandoverInput{
  dealerPartnerId:string;
  customerPartnerId:string;
  handedOverAt:string;
  reference?:string;
  note?:string;
  evidence?:Record<string,unknown>;
}

export interface VehicleOwnershipTransferInput{
  newOwnerPartnerId:string;
  occurredAt:string;
  reason?:string;
  metadata?:Record<string,unknown>;
}

export interface VehicleOwnershipReleaseInput{
  occurredAt:string;
  reason:string;
  metadata?:Record<string,unknown>;
}
