import { BadRequestException, Controller, ForbiddenException, Get, Patch, Param, Body, Req, ServiceUnavailableException } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { testRideService } from './runtime.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES=['NEW','REVIEWING','CONTACTED','CLOSED'] as const;
const permitted=(request:AuthenticatedRequest)=>{
 const actor=requireAuth(request);
 if(!actor.roles.includes('system_admin'))throw new ForbiddenException('Admin access required');
};

@Controller('v1/test-rides')
export class TestRideAdminController {
 @Get()
 async list(@Req() request:AuthenticatedRequest) {
  permitted(request);
  try { return {data:await testRideService.list()}; }
  catch {throw new ServiceUnavailableException('Test-ride requests unavailable');}
 }
 @Get('locations')
 async locations(@Req() request:AuthenticatedRequest){
  permitted(request);
  try{return {data:await testRideService.listLocations()};}
  catch{throw new ServiceUnavailableException('Locations unavailable');}
 }
 @Patch(':id')
 async update(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:unknown){
  permitted(request);
  if(!UUID.test(id)||!body||typeof body!=='object'||Array.isArray(body))
   throw new BadRequestException('Invalid request');
  const b=body as Record<string,unknown>;
  if(typeof b.status!=='string'||!STATUSES.includes(b.status as typeof STATUSES[number])||
     (b.locationId!==null&&(typeof b.locationId!=='string'||!UUID.test(b.locationId))))
   throw new BadRequestException('Invalid status or location');
  try {
   const ok=await testRideService.change(id,b.status as typeof STATUSES[number],b.locationId as string|null);
   if(!ok)throw new BadRequestException('Request or eligible partner location not found');
   return {data:{updated:true}};
  }catch(error){if(error instanceof BadRequestException)throw error;
   throw new ServiceUnavailableException('Unable to update test-ride request');}
 }
 @Patch('locations/:id')
 async updateLocation(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:unknown){
  permitted(request);
  if(!UUID.test(id)||!body||typeof body!=='object'||Array.isArray(body)||
     typeof (body as Record<string,unknown>).enabled!=='boolean')
    throw new BadRequestException('Invalid location update');
  try {
   const ok=await testRideService.authorizeLocation(id,(body as {enabled:boolean}).enabled);
   if(!ok)throw new BadRequestException('Location missing or not approved for test rides');
   return {data:{updated:true}};
  }catch(error){if(error instanceof BadRequestException)throw error;
   throw new ServiceUnavailableException('Unable to update partner location');}
 }
}
