import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

/**
 * Health check pour Render / orchestration (sans auth).
 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
