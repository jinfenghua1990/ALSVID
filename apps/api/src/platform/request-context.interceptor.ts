import { randomUUID } from 'node:crypto';
import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { JsonConsoleLogger } from '@alsvid/observability';
import { Observable, finalize } from 'rxjs';
import { apiRequestContextStore, type ApiRequestContext } from './request-context.js';

const logger = new JsonConsoleLogger({ service: 'alsvid-api' });

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return value?.trim() || undefined;
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      method?: string;
      url?: string;
    }>();
    const response = context.switchToHttp().getResponse<any>();
    const headers = request.headers ?? {};
    const requestId = headerValue(headers['x-request-id']) ?? randomUUID();
    const correlationId = headerValue(headers['x-correlation-id']) ?? requestId;
    const operation: ApiRequestContext = {
      requestId,
      correlationId,
      method: request.method ?? 'UNKNOWN',
      url: request.url ?? '',
    };
    const startedAt = Date.now();

    if (typeof response?.header === 'function') {
      response.header('x-request-id', requestId);
      response.header('x-correlation-id', correlationId);
    } else if (typeof response?.setHeader === 'function') {
      response.setHeader('x-request-id', requestId);
      response.setHeader('x-correlation-id', correlationId);
    }

    return new Observable((subscriber) => {
      apiRequestContextStore.run(operation, () => {
        logger.info('api.request.started', operation);
        next.handle()
          .pipe(finalize(() => logger.info('api.request.completed', { ...operation, durationMs: Date.now() - startedAt })))
          .subscribe(subscriber);
      });
    });
  }
}
