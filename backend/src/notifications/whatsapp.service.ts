import { Injectable } from '@nestjs/common';
import { sayelesendSend, normalizeE164 } from './sayelesend.util';

/**
 * Envoi WhatsApp via Sayelesend (channel "whatsapp").
 *
 * Variables d'environnement :
 *   - SAYELESEND_API_KEY : clé API (Bearer token)
 *   - SAYELESEND_WHATSAPP_FROM (optionnel) : Sender ID WhatsApp
 *   - COUNTRY_CODE : indicatif par défaut (225, 33, ...)
 */
@Injectable()
export class WhatsappService {
  private readonly apiKey = process.env.SAYELESEND_API_KEY;
  private readonly from = process.env.SAYELESEND_WHATSAPP_FROM;

  /** Vérifie si l'envoi WhatsApp est configuré. */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /** Compat legacy : normalise au format E.164 (ex: +2250759928005). */
  normalizePhone(phone: string): string {
    return normalizeE164(phone);
  }

  /**
   * Envoie un message texte WhatsApp via Sayelesend.
   * @returns { messageId } en succès, { error } en échec, null si non configuré.
   */
  async sendText(
    toPhone: string,
    body: string,
  ): Promise<{ messageId: string } | { error: string } | null> {
    if (!this.isConfigured()) return null;
    const to = normalizeE164(toPhone);
    const result = await sayelesendSend({
      apiKey: this.apiKey!,
      to,
      message: body,
      channel: 'whatsapp',
      from: this.from,
      logPrefix: '[WhatsApp/Sayelesend]',
    });
    return result;
  }

  /**
   * Compat avec le code existant (anciennement Meta Cloud API).
   * Sayelesend ne gère pas les templates Meta : on tombe en fallback sur sendText.
   * - Si bodyParams est fourni, on substitue {{1}}, {{2}}, ... dans un template local minimal.
   * - Sinon on envoie le nom du template comme texte brut.
   *
   * NOTE : pour les invitations d'activation, préférer utiliser directement sendText(activationLink).
   */
  async sendTemplate(
    toPhone: string,
    templateName: string,
    _languageCode: string,
    bodyParams?: string[],
  ): Promise<{ messageId: string } | { error: string } | null> {
    if (!this.isConfigured()) return null;
    const body = bodyParams && bodyParams.length > 0
      ? bodyParams.join(' ')
      : templateName;
    return this.sendText(toPhone, body);
  }
}
