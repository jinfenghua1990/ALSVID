import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { DomainError } from '@alsvid/kernel';
import { JsonConsoleLogger } from '@alsvid/observability';
import { currentApiRequestContext } from './request-context.js';

const logger = new JsonConsoleLogger({ service: 'alsvid-api' });

function statusFor(error: DomainError): number {
  if (error.kind === 'VALIDATION' || error.kind === 'INTEGRATION') return HttpStatus.BAD_REQUEST;
  if (error.kind === 'NOT_FOUND') return HttpStatus.NOT_FOUND;
  if (error.kind === 'CONFLICT') return HttpStatus.CONFLICT;
  if (error.kind === 'FORBIDDEN') return HttpStatus.FORBIDDEN;
  if (error.kind === 'UNAUTHORIZED') return HttpStatus.UNAUTHORIZED;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<any>();
    const context = currentApiRequestContext();

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      response.status(status).send(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    if (error instanceof DomainError) {
      const status = statusFor(error);
      response.status(status).send({
        statusCode: status,
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        ...(context ? { requestId: context.requestId, correlationId: context.correlationId } : {}),
      });
      return;
    }

    logger.error('api.request.failed', {
      ...(context ?? {}),
      error: error instanceof Error ? error : String(error),
    });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      ...(context ? { requestId: context.requestId, correlationId: context.correlationId } : {}),
    });
  }
}
