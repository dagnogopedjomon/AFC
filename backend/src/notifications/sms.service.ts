import { Injectable } from '@nestjs/common';

/**
 * Envoi SMS via Wirepick (passerelle SMS, Côte d'Ivoire / Afrique).
 *
 * Utilise WIREPICK_API_URL, WIREPICK_CLIENT, WIREPICK_PASSWORD et WIREPICK_FROM dans le .env.
 * Inscription : https://portal.wirepick.com/access/register
 */
@Injectable()
export class SmsService {
  private readonly apiUrl = (process.env.WIREPICK_API_URL || '').replace(/\/$/, '');
  private readonly client = process.env.WIREPICK_CLIENT;
  private readonly password = process.env.WIREPICK_PASSWORD;
  private readonly from = process.env.WIREPICK_FROM;

  isConfigured(): boolean {
    return Boolean(this.apiUrl && this.client && this.password && this.from);
  }

  /**
   * Normalise le numéro : chiffres uniquement, avec indicatif pays.
   * Côte d'Ivoire (225) : 07 59 92 80 05 → 2250759928005.
   * France (33) : 06 12 34 56 78 → 33612345678.
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const countryCode = process.env.COUNTRY_CODE || '33';
    if (digits.startsWith('0') && digits.length === 10) {
      if (countryCode === '225') {
        return countryCode + digits;
      }
      return countryCode + digits.slice(1);
    }
    if (digits.startsWith('33') && digits.length === 11) return digits;
    if (digits.startsWith('225') && digits.length >= 11) return digits;
    return digits;
  }

  /**
   * Parse une réponse XML simple (status, msgid) retournée par Wirepick.
   */
  private parseXmlResponse(xml: string): { status?: string; msgid?: string } {
    const statusMatch = xml.match(/<status>([^<]*)<\/status>/i);
    const msgidMatch = xml.match(/<msgid>([^<]*)<\/msgid>/i);
    return {
      status: statusMatch ? statusMatch[1].trim() : undefined,
      msgid: msgidMatch ? msgidMatch[1].trim() : undefined,
    };
  }

  /**
   * Envoie un SMS texte via l'API Wirepick.
   * Retourne messageId en cas de succès, null sinon.
   */
  async send(
    toPhone: string,
    body: string,
  ): Promise<{ messageId: string } | null> {
    if (!this.isConfigured()) return null;

    const to = this.normalizePhone(toPhone);
    const url = `${this.apiUrl}/api/call`;
    console.log('[SMS/Wirepick] Envoi vers:', to, '(FROM=' + this.from + ')');

    const params = new URLSearchParams({
      client: this.client!,
      password: this.password!,
      phone: to,
      text: body,
      from: this.from!,
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const text = await res.text();
      const parsed = this.parseXmlResponse(text);

      if (!res.ok) {
        console.error('[SMS/Wirepick] HTTP', res.status, 'vers', to, '—', text.slice(0, 200));
        return null;
      }

      // Wirepick retourne un statut XML ; un succès typique peut être "0" ou "OK" selon leur doc.
      const success =
        parsed.status === '0' ||
        parsed.status?.toLowerCase() === 'ok' ||
        parsed.msgid != null;

      if (!success) {
        console.error('[SMS/Wirepick] Erreur vers', to, '— status:', parsed.status, 'body:', text.slice(0, 200));
        return null;
      }

      console.log('[SMS/Wirepick] Envoyé vers', to, '— msgid:', parsed.msgid ?? '—');
      return parsed.msgid ? { messageId: parsed.msgid } : { messageId: 'wirepick-' + Date.now() };
    } catch (err) {
      console.error('[SMS/Wirepick] send failed:', err);
      return null;
    }
  }
}
