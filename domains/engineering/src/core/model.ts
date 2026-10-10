export const EngineeringCapability={Read:'engineering.read',Write:'engineering.write',Release:'engineering.release'} as const;
export interface EngineeringActor{userId:string;permissions:readonly string[]}
export interface EngineeringSummary{parts:any[];boms:any[];buildSpecs:any[]}
