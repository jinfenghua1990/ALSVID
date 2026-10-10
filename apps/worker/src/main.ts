import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Module({})
class WorkerModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'warn', 'error'],
  });

  app.enableShutdownHooks();
  console.log('ALSVID worker started');
}

void bootstrap();
