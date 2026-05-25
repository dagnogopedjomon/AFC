import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../auth/public.decorator';
import { JekoService } from '../contributions/jeko.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly webhookSecret = process.env.JEKO_WEBHOOK_SECRET ?? '';

  constructor(private readonly jekoService: JekoService) {}

  @Public()
  @Post('jeko')
  async handleJeko(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    // 1. Vérifier la signature HMAC-SHA256
    const signature = req.headers['jeko-signature'] as string | undefined;
    if (!signature || !this.webhookSecret) {
      this.logger.warn('[Webhook Jeko] Signature manquante ou secret non configuré');
      return res.status(400).json({ error: 'Missing signature' });
    }

    const rawBody: Buffer = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');

    let signaturesMatch: boolean;
    try {
      signaturesMatch = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      this.logger.warn('[Webhook Jeko] Signature invalide');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Parser le payload
    const payload = req.body as {
      id?: string;
      status?: string;
      transactionType?: string;
      transactionDetails?: {
        reference?: string;
        id?: string;
      };
      amount?: { amount?: number; currency?: string };
    };

    this.logger.log(`[Webhook Jeko] event reçu: ${payload.transactionType} / ${payload.status} / ref=${payload.transactionDetails?.reference}`);

    // 3. Traiter uniquement les paiements réussis
    if (payload.transactionType !== 'payment' || payload.status !== 'success') {
      return res.status(200).json({ received: true, processed: false });
    }

    const reference = payload.transactionDetails?.reference;
    if (!reference) {
      this.logger.warn('[Webhook Jeko] Pas de référence dans transactionDetails');
      return res.status(200).json({ received: true, processed: false });
    }

    // 4. Enregistrer le paiement automatiquement
    try {
      const result = await this.jekoService.recordFromWebhook(reference);
      this.logger.log(`[Webhook Jeko] ${result.recorded ? 'Paiement enregistré' : 'Déjà traité'} pour ref=${reference}`);
      return res.status(200).json({ received: true, processed: result.recorded });
    } catch (err) {
      this.logger.error('[Webhook Jeko] Erreur lors de l\'enregistrement:', err);
      // Retourner 200 quand même pour éviter que Jeko re-essaie en boucle
      return res.status(200).json({ received: true, processed: false, error: String(err) });
    }
  }
}
