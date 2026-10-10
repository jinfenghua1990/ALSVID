export const DealerCapability={Read:'dealer.read',Write:'dealer.write'} as const;
export type DealerStatus='PROSPECT'|'ACTIVE'|'SUSPENDED'|'CLOSED';
export interface CreateDealerInput{partnerId:string;status?:DealerStatus;marketCountries?:string[];salesEnabled?:boolean;serviceEnabled?:boolean;defaultShippingAddressId?:string;defaultContactId?:string;defaultInventoryLocationId?:string;note?:string}
export interface UpdateDealerInput{expectedVersion:number;marketCountries?:string[]|null;salesEnabled?:boolean;serviceEnabled?:boolean;defaultShippingAddressId?:string|null;defaultContactId?:string|null;defaultInventoryLocationId?:string|null;note?:string}
export interface ChangeDealerStatusInput{expectedVersion:number;status:DealerStatus;reason?:string}
