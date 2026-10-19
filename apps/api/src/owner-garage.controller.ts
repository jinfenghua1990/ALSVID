import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { vehicleService } from './runtime.js';

@Controller('v1/my/garage')
export class OwnerGarageController {
 @Get()
 list(@Req() request:AuthenticatedRequest) {
  return vehicleService.ownedGarage(requireAuth(request)).then(data=>({data}));
 }
 @Get(':id')
 detail(@Req() request:AuthenticatedRequest,@Param('id') id:string) {
  return vehicleService.ownedVehicle(requireAuth(request),id).then(data=>({data}));
 }
}

@Controller('v1/vehicles')
export class VehicleOwnerAccessController {
 @Get(':id/owner-access')
 status(@Req() request:AuthenticatedRequest,@Param('id') id:string){
  return vehicleService.ownerAccess(requireAuth(request),id).then(data=>({data}));
 }
 @Post(':id/owner-access/grant')
 grant(@Req() request:AuthenticatedRequest,@Param('id') id:string,
  @Body() input:{customerUserId:string;evidenceRef:string}) {
  return vehicleService.grantOwnerAccess(requireAuth(request),id,input?.customerUserId,input?.evidenceRef).then(data=>({data}));
 }
 @Post(':id/owner-access/revoke')
 revoke(@Req() request:AuthenticatedRequest,@Param('id') id:string,
  @Body() input:{evidenceRef:string}) {
  return vehicleService.revokeOwnerAccess(requireAuth(request),id,input?.evidenceRef).then(data=>({data}));
 }
}
