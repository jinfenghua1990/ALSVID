import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { database } from './runtime.js';
import { Public } from './public.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  async health(): Promise<{ service: string; status: 'ok'; version: string }> {
    try {
      await database.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database is not ready');
    }
    return {
      service: 'alsvid-api',
      status: 'ok',
      version: process.env.ALSVID_RELEASE_SHA ?? 'unknown',
    };
  }
}
