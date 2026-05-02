import { Injectable } from '@nestjs/common';
import { sayelesendSend, normalizeE164 } from './sayelesend.util';

/**
 * Envoi SMS via Sayelesend (https://api.sayelesend.com/api/v1/sms/send).
 *
 * Variables d'environnement :
 *   - SAYELESEND_API_KEY : clé API (Bearer token)
 *   - SAYELESEND_SMS_FROM (optionnel) : Sender ID
 *   - COUNTRY_CODE : indicatif par défaut (225, 33, ...)
 */
@Injectable()
export class SmsService {
  private readonly apiKey = process.env.SAYELESEND_API_KEY;
  private readonly from = process.env.SAYELESEND_SMS_FROM;

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /** Envoi SMS. Retourne { messageId } si OK, null sinon. */
  async send(
    toPhone: string,
    body: string,
  ): Promise<{ messageId: string } | null> {
    if (!this.isConfigured()) return null;
    const to = normalizeE164(toPhone);
    const result = await sayelesendSend({
      apiKey: this.apiKey!,
      to,
      message: body,
      channel: 'sms',
      from: this.from,
      logPrefix: '[SMS/Sayelesend]',
    });
    if (!result || 'error' in result) return null;
    return { messageId: result.messageId };
  }
}
