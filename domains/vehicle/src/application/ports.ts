import type{QueryExecutor}from'@alsvid/database';
export interface VehicleActor{userId:string;permissions:readonly string[];roles?:readonly string[]}
export interface VehicleAuditPort{record(input:{actorUserId:string;action:string;targetType:string;targetId:string;metadata?:Record<string,unknown>},executor?:QueryExecutor):Promise<void>}
export interface VehicleRepository{transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>;list():Promise<any[]>;get(id:string):Promise<any|null>;
 listOwned(userId:string):Promise<any[]>;getOwned(userId:string,vehicleId:string):Promise<any|null>;
 lockForOwnerChange(id:string,executor:QueryExecutor):Promise<boolean>;
 latestOwner(vehicleId:string,executor:QueryExecutor):Promise<{customerUserId:string;kind:string}|null>;
 eligibleOwner(userId:string,executor:QueryExecutor):Promise<boolean>;
 recordOwnerEvent(vehicleId:string,customerUserId:string,kind:'GRANTED'|'REVOKED',evidenceRef:string,actorId:string,executor:QueryExecutor):Promise<void>;lockBirthCandidate(unitId:string,executor:QueryExecutor):Promise<any|null>;latestQc(unitId:string,executor:QueryExecutor):Promise<any|null>;createVehicle(input:{frameNumber:string;unitId:string;productionOrderId:string;buildSpecId:string;skuId:string;factoryPartnerId:string;birthQcInspectionId:string;actorUserId:string},executor:QueryExecutor):Promise<any>}
