import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import {comparisonImageLimit,comparisonImageTypes} from './comparison-media.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // The service is only reachable through the gateway/Cloud Run front end, so the
    // forwarded client address is what public rate limiting must key on. Exactly one
    // hop is trusted: `true` would take the leftmost X-Forwarded-For entry, which the
    // caller can forge to get a fresh rate-limit bucket on every request.
    new FastifyAdapter({ logger: true, trustProxy: 1 }),
  );

  app.getHttpAdapter().getInstance().addContentTypeParser([...comparisonImageTypes],
    {parseAs:'buffer',bodyLimit:comparisonImageLimit},
    (_request:unknown,body:Buffer,done:(error:Error|null,value:Buffer)=>void)=>done(null,body));

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  // Cloud Run injects PORT for service containers. API_PORT remains the
  // provider-neutral/local override used by the existing development stack.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT/API_PORT must be a valid TCP port');
  }

  await app.listen({ port, host: '0.0.0.0' });
}

void bootstrap();
