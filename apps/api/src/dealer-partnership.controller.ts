import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode,
 HttpException, HttpStatus, Post, Query, Req, ServiceUnavailableException } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { Public } from './public.decorator.js';
import { database } from './runtime.js';
import { normalizeDealerApplication, publicDealerLocation } from './dealer-partnership-input.js';

@Controller('v1')
export class DealerPartnershipController {
 @Public()
 @Post('public/dealer-applications')
 @HttpCode(HttpStatus.CREATED)
 async apply(@Body() body:unknown) {
  const input=normalizeDealerApplication(body);
  if(!input)throw new BadRequestException('Invalid dealer application');
  try {
   return await database.transaction(async (db)=>{
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[input.email]);
    const previous=await db.query<{id:string;client_request_id:string}>(
     "SELECT id,client_request_id FROM partners.dealer_applications WHERE lower(email)=$1 AND submitted_at > now() - interval '24 hours' ORDER BY submitted_at DESC LIMIT 3",
     [input.email]);
    const same=previous.rows.find(row=>row.client_request_id===input.clientRequestId);
    if(same)return {data:{received:true,reference:same.id}};
    if(previous.rows.length)throw new HttpException('Application already received recently',HttpStatus.TOO_MANY_REQUESTS);
    const result=await db.query<{id:string}>(
     'INSERT INTO partners.dealer_applications (client_request_id,company_name,contact_name,email,country_code,partnership_type,website,message,locale) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
     [input.clientRequestId,input.companyName,input.contactName,input.email,input.country,input.partnershipType,input.website,input.message,input.locale]);
    return {data:{received:true,reference:result.rows[0]!.id}};
   });
  } catch(error) {
   if(error instanceof HttpException)throw error;
   throw new ServiceUnavailableException('Dealer applications cannot be accepted right now');
  }
 }

 @Public()
 @Get('public/dealer-locations')
 async locations(@Query('country') country?:string,@Query('capability') capability?:string) {
  if(country && !['DE','AT'].includes(country))throw new BadRequestException('Invalid country');
  if(capability && !['sales','service'].includes(capability))throw new BadRequestException('Invalid capability');
  try {
   const results=await database.query<{
    id:string;display_name:string;country_code:'DE'|'AT';city:string;address:string;
    sales_authorized:boolean;service_authorized:boolean;
   }>(
    'SELECT id,display_name,country_code,city,address,sales_authorized,service_authorized '+
    'FROM partners.public_locations WHERE approved_for_publication=true AND authorization_active=true '+
    'AND ($1::text IS NULL OR country_code=$1) '+
    "AND ($2::text IS NULL OR CASE WHEN $2='sales' THEN sales_authorized ELSE service_authorized END) "+
    'ORDER BY country_code,lower(city),lower(display_name) LIMIT 200',
    [country??null,capability??null]);
   return {data:results.rows.map(publicDealerLocation)};
  } catch {throw new ServiceUnavailableException('Dealer directory temporarily unavailable');}
 }

 @Get('dealer-applications')
 async adminApplications(@Req() request:AuthenticatedRequest) {
  const actor=requireAuth(request);
  if(!actor.roles.includes('system_admin'))throw new ForbiddenException('Admin access required');
  const result=await database.query<{
   id:string;company_name:string;contact_name:string;email:string;
   country_code:string;partnership_type:string;website:string|null;
   message:string|null;locale:string;status:string;submitted_at:Date;
  }>('SELECT id,company_name,contact_name,email,country_code,partnership_type,website,message,locale,status,submitted_at '+
     'FROM partners.dealer_applications ORDER BY submitted_at DESC LIMIT 200');
  return {data:result.rows.map(row=>({id:row.id,companyName:row.company_name,
    contactName:row.contact_name,email:row.email,country:row.country_code,
    partnershipType:row.partnership_type,website:row.website,message:row.message,
    locale:row.locale,status:row.status,submittedAt:row.submitted_at.toISOString()}))};
 }
}
