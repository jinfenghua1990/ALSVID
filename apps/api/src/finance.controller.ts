import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { CreateFinanceDocumentInput } from '@alsvid/finance';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { financeService } from './runtime.js';

@Controller('v1/finance')
export class FinanceController{
  @Get()
  async summary(@Req() request:AuthenticatedRequest){try{return{data:await financeService.summary(requireAuth(request))};}catch(error){return throwHttpDomainError(error);}}

  @Post('documents')
  async createDocument(@Req() request:AuthenticatedRequest,@Body() input:CreateFinanceDocumentInput){try{return{data:await financeService.createDocument(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('documents/:id/verify')
  async verifyDocument(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:{expectedVersion:number}){try{return{data:await financeService.verifyDocument(requireAuth(request),id,input.expectedVersion)};}catch(error){return throwHttpDomainError(error);}}
  @Post('documents/:id/draft')
  async returnToDraft(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:{expectedVersion:number}){try{return{data:await financeService.returnDocumentToDraft(requireAuth(request),id,input.expectedVersion)};}catch(error){return throwHttpDomainError(error);}}
  @Post('documents/:id/post')
  async postDocument(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:{expectedVersion:number}){try{return{data:await financeService.postDocument(requireAuth(request),id,input.expectedVersion)};}catch(error){return throwHttpDomainError(error);}}
  @Post('documents/:id/void')
  async voidDocument(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:{expectedVersion:number;reason:string}){try{return{data:await financeService.voidDocument(requireAuth(request),id,input.expectedVersion,input.reason)};}catch(error){return throwHttpDomainError(error);}}

  @Post('obligations')
  async createObligation(@Req() request:AuthenticatedRequest,@Body() input:any){try{return{data:await financeService.createObligation(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('obligations/:id/void')
  async voidObligation(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:{reason:string}){try{return{data:await financeService.voidObligation(requireAuth(request),id,input.reason)};}catch(error){return throwHttpDomainError(error);}}

  @Post('payments')
  async createPayment(@Req() request:AuthenticatedRequest,@Body() input:any){try{return{data:await financeService.createPayment(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('payments/:id/reverse')
  async reversePayment(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:{reason:string}){try{return{data:await financeService.reversePayment(requireAuth(request),id,input.reason)};}catch(error){return throwHttpDomainError(error);}}
  @Post('fx-rates')
  async createFxRate(@Req() request:AuthenticatedRequest,@Body() input:any){try{return{data:await financeService.createFxRate(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('allocations')
  async allocate(@Req() request:AuthenticatedRequest,@Body() input:any){try{return{data:await financeService.allocatePayment(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('allocations/:id/reverse')
  async reverseAllocation(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:{reason:string}){try{return{data:await financeService.reverseAllocation(requireAuth(request),id,input.reason)};}catch(error){return throwHttpDomainError(error);}}

  @Post('landed-cost/batches')
  async createLandedBatch(@Req() request:AuthenticatedRequest,@Body() input:any){try{return{data:await financeService.createLandedCostBatch(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('landed-cost/batches/:id/components')
  async addLandedComponent(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){try{return{data:await financeService.addLandedCostComponent(requireAuth(request),id,input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('landed-cost/components/:id/allocations')
  async allocateLanded(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){try{return{data:await financeService.allocateLandedCost(requireAuth(request),id,input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('landed-cost/batches/:id/finalize')
  async finalizeLanded(@Req() request:AuthenticatedRequest,@Param('id') id:string){try{return{data:await financeService.finalizeLandedCostBatch(requireAuth(request),id)};}catch(error){return throwHttpDomainError(error);}}
}
