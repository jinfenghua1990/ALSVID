import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  type RawBodyRequest,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createShopifyWebhookVerifier } from '@alsvid/integrations';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { Public } from './public.decorator.js';
import { integrationService } from './runtime.js';

@Controller('v1/integrations')
export class IntegrationsController{
  @Get()
  async summary(@Req() request:AuthenticatedRequest){try{return{data:await integrationService.summary(requireAuth(request))};}catch(error){return throwHttpDomainError(error);}}

  @Public()
  @Post('shopify/:channelId/webhook')
  async shopifyWebhook(
    @Req() request: RawBodyRequest<AuthenticatedRequest>,
    @Param('channelId') channelId: string,
    @Body() payload: Record<string, unknown>,
    @Headers('x-shopify-hmac-sha256') signature?: string,
    @Headers('x-shopify-webhook-id') webhookId?: string,
    @Headers('x-shopify-event-id') eventId?: string,
    @Headers('x-shopify-topic') topic?: string,
    @Headers('x-shopify-shop-domain') shopDomain?: string,
    @Headers('x-shopify-api-version') apiVersion?: string,
    @Headers('x-shopify-triggered-at') triggeredAt?: string,
  ) {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
    const actorUserId = process.env.SHOPIFY_WEBHOOK_ACTOR_USER_ID?.trim();
    if (!secret || !actorUserId) {
      throw new ServiceUnavailableException('Shopify webhook receiver is not configured');
    }
    if (!request.rawBody) throw new BadRequestException('Raw webhook body is unavailable');
    if (!signature || !createShopifyWebhookVerifier(secret).verify(request.rawBody, signature)) {
      throw new UnauthorizedException('Invalid Shopify webhook signature');
    }

    const delivery = {
      webhookId: requiredHeader(webhookId, 'X-Shopify-Webhook-Id'),
      ...(eventId ? { eventId } : {}),
      topic: requiredHeader(topic, 'X-Shopify-Topic'),
      shopDomain: requiredHeader(shopDomain, 'X-Shopify-Shop-Domain'),
      ...(apiVersion ? { apiVersion } : {}),
      ...(triggeredAt ? { triggeredAt } : {}),
      payload,
    };

    try {
      return {
        data: await integrationService.ingestShopify(
          { userId: actorUserId, permissions: ['integrations.ingest'] },
          channelId,
          delivery,
        ),
      };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

  @Post('shopify/:channelId/ingest')
  async ingestShopify(@Req() request:AuthenticatedRequest,@Param('channelId') channelId:string,@Body() input:any){try{return{data:await integrationService.ingestShopify(requireAuth(request),channelId,input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('shopify/receipts/:id/replay')
  async replayShopify(@Req() request:AuthenticatedRequest,@Param('id') id:string){try{return{data:await integrationService.replayShopify(requireAuth(request),id)};}catch(error){return throwHttpDomainError(error);}}
  @Post('channels/:channelId/cursors')
  async cursor(@Req() request:AuthenticatedRequest,@Param('channelId') channelId:string,@Body() input:any){try{return{data:await integrationService.setCursor(requireAuth(request),channelId,input)};}catch(error){return throwHttpDomainError(error);}}
}

function requiredHeader(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException(`${name} header is required`);
  return normalized;
}
