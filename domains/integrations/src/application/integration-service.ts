import { postgresErrorCode, type QueryExecutor } from '@alsvid/database';
import { ForbiddenError } from '@alsvid/kernel';
import { IntegrationCapability, type CreateWarehouseProviderConnectionInput, type ShopifyDeliveryInput } from '../core/model.js';
import {
  IntegrationConflictError,
  IntegrationNotFoundError,
  IntegrationValidationError,
} from '../core/errors.js';
import {
  integrationObject,
  integrationRequired,
  integrationText,
  integrationTimestamp,
} from '../core/values.js';
import type {
  CommerceIngestionPort,
  EvidenceHasherPort,
  IntegrationActor,
  IntegrationAuditPort,
  IntegrationRepository,
  ShopifyNormalizerPort,
} from './ports.js';

type IdentifiedRow = Record<string, unknown> & { id: string };

export interface IngestionResult {
  receipt: IdentifiedRow;
  attempt: Record<string, unknown>;
  duplicate: boolean;
  entity?: IdentifiedRow;
}

export class IntegrationService {
  constructor(
    private readonly repository: IntegrationRepository,
    private readonly audit: IntegrationAuditPort,
    private readonly commerce: CommerceIngestionPort,
    private readonly normalizer: ShopifyNormalizerPort,
    private readonly hasher: EvidenceHasherPort,
  ) {}

  async summary(actor: IntegrationActor): Promise<any> {
    requirePermission(actor, 'commerce.read');
    return this.repository.summary();
  }

  async warehouseProviderSummary(actor: IntegrationActor): Promise<any> {
    requirePermission(actor, IntegrationCapability.Admin);
    return this.repository.warehouseProviderSummary();
  }

  async createWarehouseProviderConnection(
    actor: IntegrationActor,
    input: CreateWarehouseProviderConnectionInput,
  ): Promise<any> {
    requirePermission(actor, IntegrationCapability.Admin);
    const providerCode = integrationRequired(input.providerCode, 'providerCode').toUpperCase();
    const displayName = integrationRequired(input.displayName, 'displayName');
    const accountRef = integrationRequired(input.accountRef, 'accountRef');
    const credentialsSecretRef = integrationText(input.credentialsSecretRef) ?? undefined;

    if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(providerCode)) {
      throw new IntegrationValidationError('providerCode must be 2-64 uppercase letters, numbers, dots, underscores or hyphens');
    }
    if (displayName.length < 2 || displayName.length > 120) {
      throw new IntegrationValidationError('displayName must be between 2 and 120 characters');
    }
    if (accountRef.length > 255) {
      throw new IntegrationValidationError('accountRef must be at most 255 characters');
    }
    if (credentialsSecretRef && !/^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/secrets\/[A-Za-z0-9_-]{1,255}\/versions\/(latest|[1-9][0-9]*)$/.test(credentialsSecretRef)) {
      throw new IntegrationValidationError('credentialsSecretRef must be a Google Secret Manager resource path, not a secret value');
    }

    const connectionStatus = credentialsSecretRef ? 'PENDING_REVIEW' : 'NOT_CONFIGURED';
    try {
      const row = await this.repository.createWarehouseProviderConnection({
        providerCode,
        displayName,
        accountRef,
        ...(credentialsSecretRef ? { credentialsSecretRef } : {}),
        connectionStatus,
        actorUserId: actor.userId,
      });
      await this.audit.record({
        actorUserId: actor.userId,
        action: 'integration.warehouse_provider_created',
        targetType: 'integration.warehouse_provider_connection',
        targetId: row.id,
        metadata: { providerCode, accountRef, connectionStatus, credentialsConfigured: Boolean(credentialsSecretRef) },
      });
      return row;
    } catch (error) {
      this.rethrow(error);
    }
  }

  async ingestShopify(
    actor: IntegrationActor,
    channelId: string,
    input: ShopifyDeliveryInput,
  ): Promise<IngestionResult> {
    requirePermission(actor, IntegrationCapability.Ingest);
    return this.ingestShopifyInternal(actor, channelId, input, false);
  }

  async replayShopify(actor: IntegrationActor, receiptId: string): Promise<IngestionResult> {
    requirePermission(actor, IntegrationCapability.Replay);
    const receipt = await this.repository.receiptForReplay(receiptId);
    if (!receipt) throw new IntegrationNotFoundError('Webhook receipt not found');
    if (receipt.provider !== 'SHOPIFY') throw new IntegrationValidationError('Receipt is not a Shopify delivery');

    return this.ingestShopifyInternal(
      actor,
      receipt.channel_id,
      {
        webhookId: receipt.provider_event_id,
        ...(receipt.provider_correlation_id ? { eventId: receipt.provider_correlation_id } : {}),
        topic: receipt.topic,
        shopDomain: receipt.source_account ?? receipt.external_account_id,
        ...(receipt.provider_api_version ? { apiVersion: receipt.provider_api_version } : {}),
        ...(receipt.provider_occurred_at
          ? { triggeredAt: new Date(receipt.provider_occurred_at).toISOString() }
          : {}),
        payload: integrationObject(receipt.payload),
      },
      true,
    );
  }

  async setCursor(
    actor: IntegrationActor,
    channelId: string,
    input: { cursorKey: string; cursorValue: string; sourceUpdatedAt?: string },
  ): Promise<any> {
    requirePermission(actor, IntegrationCapability.Admin);
    const row = await this.repository.setCursor({
      channelId,
      cursorKey: integrationRequired(input.cursorKey, 'cursorKey'),
      cursorValue: integrationRequired(input.cursorValue, 'cursorValue'),
      sourceUpdatedAt: integrationTimestamp(input.sourceUpdatedAt) ?? null,
      actorUserId: actor.userId,
    });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'integration.cursor_updated',
      targetType: 'integration.cursor',
      targetId: row.id,
      metadata: { channelId, cursorKey: input.cursorKey },
    });
    return row;
  }

  private async ingestShopifyInternal(
    actor: IntegrationActor,
    channelId: string,
    input: ShopifyDeliveryInput,
    replay: boolean,
  ): Promise<IngestionResult> {
    const webhookId = integrationRequired(input.webhookId, 'webhookId');
    const topic = integrationRequired(input.topic, 'topic').toLowerCase();
    const shopDomain = integrationRequired(input.shopDomain, 'shopDomain').toLowerCase();
    const payloadHash = this.hasher.sha256(input.payload);
    const triggeredAt = integrationTimestamp(input.triggeredAt);

    const channel = await this.repository.channel(channelId);
    if (!channel) throw new IntegrationNotFoundError('Commerce channel not found');
    if (channel.provider !== 'SHOPIFY') throw new IntegrationValidationError('Channel is not a Shopify channel');
    if (String(channel.external_account_id).toLowerCase() !== shopDomain) {
      throw new IntegrationConflictError('Shopify shop domain does not match channel external account');
    }

    let receipt: IdentifiedRow;
    let duplicate = false;
    try {
      receipt = await this.repository.insertReceipt({
        channelId,
        webhookId,
        eventId: integrationText(input.eventId),
        apiVersion: integrationText(input.apiVersion),
        shopDomain,
        topic,
        payloadHash,
        payload: input.payload,
        triggeredAt: triggeredAt ?? null,
      });

      if (!receipt) {
        duplicate = true;
        receipt = await this.repository.receiptByProviderId(channelId, webhookId);
        if (!receipt) throw new IntegrationConflictError('Duplicate Shopify delivery could not be loaded');
        if (receipt.payload_sha256 !== payloadHash) {
          throw new IntegrationConflictError('Same Shopify webhook id arrived with different payload evidence');
        }
      }
    } catch (error) {
      this.rethrow(error);
    }

    try {
      const result = await this.repository.transaction(async (executor) =>
        this.processReceipt(actor, channelId, input, receipt, webhookId, topic, shopDomain, replay, duplicate, executor),
      );
      return {
        receipt,
        attempt: result.attempt,
        ...(result.entity ? { entity: result.entity } : {}),
        duplicate: result.duplicate,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.transaction(async (executor) => {
        await this.repository.lockReceipt(receipt.id, executor);
        await this.repository.recordAttempt(
          {
            receiptId: receipt.id,
            outcome: 'REJECTED',
            actorUserId: actor.userId,
            errorCode: error instanceof Error ? error.constructor.name : 'ERROR',
            message,
          },
          executor,
        );
      });

      if (
        error instanceof IntegrationValidationError ||
        error instanceof IntegrationNotFoundError ||
        error instanceof IntegrationConflictError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }
      throw new IntegrationConflictError(message);
    }
  }

  private async processReceipt(
    actor: IntegrationActor,
    channelId: string,
    input: ShopifyDeliveryInput,
    receipt: IdentifiedRow,
    webhookId: string,
    topic: string,
    shopDomain: string,
    replay: boolean,
    duplicate: boolean,
    executor: QueryExecutor,
  ): Promise<{ attempt: Record<string, unknown>; duplicate: boolean; entity?: IdentifiedRow }> {
    await this.repository.lockReceipt(receipt.id, executor);
    const lastAttempt = await this.repository.latestAttempt(receipt.id, executor);
    if (lastAttempt?.outcome === 'PROCESSED' || lastAttempt?.outcome === 'NOOP') {
      const attempt = await this.repository.recordAttempt(
        {
          receiptId: receipt.id,
          outcome: 'NOOP',
          actorUserId: actor.userId,
          message: replay
            ? 'Replay skipped because delivery already processed'
            : 'Duplicate Shopify delivery already processed',
        },
        executor,
      );
      return { attempt, duplicate: true };
    }

    let entity: IdentifiedRow;
    let normalizedEntityType: string;
    if (topic.startsWith('orders/')) {
      const applied = await this.commerce.ingestOrder(
        actor,
        channelId,
        webhookId,
        this.normalizer.order(input.payload),
        executor,
      );
      entity = applied.order;
      normalizedEntityType = 'commerce.order';
    } else if (topic.startsWith('fulfillments/')) {
      const applied = await this.commerce.ingestFulfillment(
        actor,
        channelId,
        webhookId,
        this.normalizer.fulfillment(input.payload, topic),
        executor,
      );
      entity = applied.fulfillment;
      normalizedEntityType = 'commerce.fulfillment';
    } else {
      throw new IntegrationValidationError(`Unsupported Shopify commerce topic: ${topic}`);
    }

    const attempt = await this.repository.recordAttempt(
      {
        receiptId: receipt.id,
        outcome: 'PROCESSED',
        actorUserId: actor.userId,
        normalizedEntityType,
        normalizedEntityId: entity.id,
        message: replay ? 'Replayed Shopify delivery' : 'Processed Shopify delivery',
      },
      executor,
    );
    await this.audit.record(
      {
        actorUserId: actor.userId,
        action: replay ? 'integration.shopify_replayed' : 'integration.shopify_ingested',
        targetType: 'integration.webhook_receipt',
        targetId: receipt.id,
        metadata: {
          channelId,
          webhookId,
          eventId: integrationText(input.eventId),
          topic,
          shopDomain,
        },
      },
      executor,
    );
    return { attempt, entity, duplicate };
  }

  private rethrow(error: unknown): never {
    if (
      error instanceof IntegrationValidationError ||
      error instanceof IntegrationNotFoundError ||
      error instanceof IntegrationConflictError
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : '';
    const code = postgresErrorCode(error);
    if (code === '23503') throw new IntegrationNotFoundError('Referenced integration Channel or entity was not found');
    if (code === '23505') throw new IntegrationConflictError(message);
    if (code === '23514') throw new IntegrationValidationError(message);
    throw error;
  }
}

function requirePermission(actor: IntegrationActor, permission: string): void {
  if (!actor.permissions.includes(permission)) {
    throw new ForbiddenError('INTEGRATION_FORBIDDEN', `Missing permission: ${permission}`);
  }
}
