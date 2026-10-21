import type { DatabasePort } from '@alsvid/database';
import type { TestRideInput,TestRideLocation,TestRideRecord,TestRideRepository,TestRideStatus } from '../application/test-ride.js';

type RideRow = {
 id:string; name:string|null;email:string;country_code:'DE'|'AT';city:string;
 model:string;colour:string;locale:'zh'|'de'|'en';status:TestRideStatus;
 assigned_location_id:string|null;notification_state:TestRideRecord['notificationState'];
 created_at:Date;updated_at:Date;
};
type LocationRow = {
 id:string;display_name:string;country_code:'DE'|'AT';city:string;address:string;
 approved_for_publication:boolean;authorization_active:boolean;test_ride_authorized:boolean;partner_eligible:boolean;
};
const ride = (row:RideRow):TestRideRecord => ({
 id:row.id,name:row.name??'',email:row.email,country:row.country_code,city:row.city,
 model:row.model,colour:row.colour,locale:row.locale,status:row.status,
 assignedLocationId:row.assigned_location_id,notificationState:row.notification_state,
 createdAt:row.created_at.toISOString(),updatedAt:row.updated_at.toISOString()
});
const location = (row:LocationRow):TestRideLocation => ({
 id:row.id,name:row.display_name,country:row.country_code,city:row.city,
 address:row.address,approved:row.approved_for_publication,active:row.authorization_active,
 testRideAuthorized:row.test_ride_authorized,partnerEligible:row.partner_eligible
});

/** All personal data lives in the protected Partners schema and never enters the public dealer directory. */
export class PostgresTestRideRepository implements TestRideRepository {
 constructor(private readonly db:DatabasePort){}
 async submit(input:TestRideInput):Promise<{id:string;created:boolean}> {
  return this.db.transaction(async tx=>{
   await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[input.email]);
   const found=await tx.query<{id:string}>(
    `SELECT id FROM partners.test_ride_enquiries
     WHERE lower(email)=$1 AND country_code=$2 AND lower(city)=lower($3)
     AND model=$4 AND colour=$5
     AND created_at>now()-interval '24 hours'
     ORDER BY created_at DESC LIMIT 1`,[input.email,input.country,input.city,input.model,input.colour]);
   if(found.rows[0])return {id:found.rows[0].id,created:false};
   const inserted=await tx.query<{id:string}>(
    `INSERT INTO partners.test_ride_enquiries(name,email,country_code,city,model,colour,locale)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [input.name||null,input.email,input.country,input.city,input.model,input.colour,input.locale]);
   return {id:inserted.rows[0]!.id,created:true};
  });
 }
 async list():Promise<TestRideRecord[]> {
  const r=await this.db.query<RideRow>(
   `SELECT id,name,email,country_code,city,model,colour,locale,status,assigned_location_id,
    notification_state,created_at,updated_at FROM partners.test_ride_enquiries
    ORDER BY created_at DESC LIMIT 200`);
  return r.rows.map(ride);
 }
 async listLocations():Promise<TestRideLocation[]> {
  const r=await this.db.query<LocationRow>(
   `SELECT id,display_name,country_code,city,address,approved_for_publication,
    authorization_active,test_ride_authorized,
    EXISTS(SELECT 1 FROM partners.partners p JOIN partners.roles role ON role.partner_id=p.id
      WHERE p.id=partners.public_locations.partner_id AND p.status='ACTIVE'
      AND role.role='DEALER' AND role.enabled=true) AS partner_eligible
    FROM partners.public_locations
    ORDER BY country_code,lower(city),lower(display_name) LIMIT 250`);
  return r.rows.map(location);
 }
 async change(id:string,status:TestRideStatus,locationId:string|null):Promise<boolean> {
  return this.db.transaction(async tx=>{
   const record=await tx.query<{country_code:string}>(
    'SELECT country_code FROM partners.test_ride_enquiries WHERE id=$1',[id]);
   if(!record.rows[0])return false;
   if(locationId){
    const match=await tx.query<{id:string}>(
     `SELECT id FROM partners.public_locations WHERE id=$1 AND country_code=$2
      AND approved_for_publication=true AND authorization_active=true
      AND test_ride_authorized=true AND EXISTS (
       SELECT 1 FROM partners.partners p JOIN partners.roles role ON role.partner_id=p.id
       WHERE p.id=partners.public_locations.partner_id AND p.status='ACTIVE'
       AND role.role='DEALER' AND role.enabled=true
      ) FOR SHARE`,[locationId,record.rows[0].country_code]);
    if(!match.rows.length)return false;
   }
   const r=await tx.query(
    `UPDATE partners.test_ride_enquiries SET status=$2,assigned_location_id=$3,updated_at=now()
     WHERE id=$1`,[id,status,locationId]);
   return (r.rowCount??0)===1;
  });
 }
 async authorizeLocation(id:string,enabled:boolean):Promise<boolean> {
  return this.db.transaction(async tx=>{
   // Lock the location first, consistent with assignment's SELECT ... FOR SHARE.
   // Both changes happen atomically so a disabled location cannot retain open leads.
   const r=await tx.query(
    `UPDATE partners.public_locations SET test_ride_authorized=$2,updated_at=now()
     WHERE id=$1 AND (NOT $2 OR (approved_for_publication=true AND authorization_active=true
       AND EXISTS(SELECT 1 FROM partners.partners p JOIN partners.roles role ON role.partner_id=p.id
         WHERE p.id=partners.public_locations.partner_id AND p.status='ACTIVE'
         AND role.role='DEALER' AND role.enabled=true)))
     RETURNING id`,[id,enabled]);
   if((r.rowCount??0)!==1)return false;
   if(!enabled){
    // Keep CLOSED records as historical evidence; remove active lead assignments.
    await tx.query(
     `UPDATE partners.test_ride_enquiries
      SET assigned_location_id=NULL,updated_at=now()
      WHERE assigned_location_id=$1 AND status IN ('NEW','REVIEWING','CONTACTED')`,[id]);
   }
   return true;
  });
 }
 async notification(id:string,state:'SENT'|'FAILED'|'UNCONFIGURED'):Promise<void> {
  await this.db.query('UPDATE partners.test_ride_enquiries SET notification_state=$2 WHERE id=$1',[id,state]);
 }
}
