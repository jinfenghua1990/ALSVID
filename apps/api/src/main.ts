import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
    { rawBody: true },
  );

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
