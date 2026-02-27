import { Controller, Post, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CinetpayService } from './cinetpay.service';

/** Webhook CinetPay : route publique (appelée par CinetPay, pas d'auth). */
@Controller('contributions/payments/cinetpay')
export class CinetpayController {
  constructor(private readonly cinetpayService: CinetpayService) {}

  @Public()
  @Post('notify')
  @HttpCode(HttpStatus.OK)
  async notify(@Req() req: { body: Record<string, unknown> }) {
    await this.cinetpayService.handleNotify(req.body);
    return { message: 'Notification traitée' };
  }
}
