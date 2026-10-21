/** Trial-interest lifecycle. An assigned location is not a confirmed appointment. */
export type TestRideStatus = 'NEW'|'REVIEWING'|'CONTACTED'|'CLOSED';
export interface TestRideInput {
 name: string; email: string; country: 'DE'|'AT'; city: string;
 model: string; colour: string; locale: 'zh'|'de'|'en';
}
export interface TestRideRecord extends TestRideInput {
 id:string; status:TestRideStatus; assignedLocationId:string|null;
 notificationState:'PENDING'|'SENT'|'FAILED'|'UNCONFIGURED';
 createdAt:string; updatedAt:string;
}
export interface TestRideLocation {
 id:string; name:string; country:'DE'|'AT';city:string;address:string;
 approved:boolean;active:boolean;testRideAuthorized:boolean;
}
export interface TestRideRepository {
 submit(input:TestRideInput):Promise<{id:string;created:boolean}>;
 list():Promise<TestRideRecord[]>;
 listLocations():Promise<TestRideLocation[]>;
 change(id:string, status:TestRideStatus, locationId:string|null):Promise<boolean>;
 authorizeLocation(id:string, enabled:boolean):Promise<boolean>;
 notification(id:string,state:'SENT'|'FAILED'|'UNCONFIGURED'):Promise<void>;
}
export class TestRideService {
 constructor(private readonly repository:TestRideRepository) {}
 submit(input:TestRideInput){return this.repository.submit(input);}
 list(){return this.repository.list();}
 listLocations(){return this.repository.listLocations();}
 change(id:string,status:TestRideStatus,locationId:string|null){return this.repository.change(id,status,locationId);}
 authorizeLocation(id:string,enabled:boolean){return this.repository.authorizeLocation(id,enabled);}
 notification(id:string,state:'SENT'|'FAILED'|'UNCONFIGURED'){return this.repository.notification(id,state);}
}
