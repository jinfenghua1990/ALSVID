import { Controller, Get } from '@nestjs/common';
import { Public } from './public.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health(): { service: string; status: 'ok'; version: string } {
    return {
      service: 'alsvid-api',
      status: 'ok',
      version: '0.1.0',
    };
  }
}
