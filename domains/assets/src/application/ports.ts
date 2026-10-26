import type{RegisterAssetInput,PublicAssetMediaReference}from'../core/model.js';
export interface AssetAuditPort{record(input:{actorUserId:string;action:string;targetType:string;targetId:string;metadata?:Record<string,unknown>}):Promise<void>}
export type RegisterAssetRecord=Omit<RegisterAssetInput,'checksumSha256'>&{checksumSha256:string|null;actorUserId:string};
export interface AssetRepository{register(input:RegisterAssetRecord):Promise<any>;link(assetId:string,input:{entityType:string;entityId:string;purpose:string;sortOrder:number;actorUserId:string}):Promise<any>;forEntity(entityType:string,entityId:string):Promise<any[]>;publicLinkedMedia(assetId:string,entityType:string,entityId:string):Promise<PublicAssetMediaReference|null>}
