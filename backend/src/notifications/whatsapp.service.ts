import { Injectable } from '@nestjs/common';

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

@Injectable()
export class WhatsappService {
  private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  /** Vérifie si l'envoi WhatsApp est configuré. */
  isConfigured(): boolean {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  /**
   * Normalise le numéro pour l'API WhatsApp : chiffres uniquement, avec indicatif pays.
   * Pour Côte d'Ivoire (225) : 07 59 92 80 05 → 22575928005 (on enlève le 0 initial).
   * Pour France (33) : 06 12 34 56 78 → 33612345678.
   */
  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const countryCode = process.env.COUNTRY_CODE || '33';
    if (digits.startsWith('0') && digits.length === 10) {
      return countryCode + digits.slice(1);
    }
    if (digits.startsWith('33') && digits.length === 11) return digits;
    if (digits.startsWith('225') && digits.length >= 11) return digits;
    return digits;
  }

  /**
   * Envoie un message texte via l'API WhatsApp Cloud.
   * @returns messageId (WAMID), ou { error } en cas d'échec, ou null si non configuré
   */
  async sendText(toPhone: string, body: string): Promise<{ messageId: string } | { error: string } | null> {
    if (!this.isConfigured()) {
      return null;
    }
    const to = this.normalizePhone(toPhone);
    console.log('[WhatsApp] Envoi vers:', to, '(COUNTRY_CODE=' + (process.env.COUNTRY_CODE || '33') + ')');
    const url = `${GRAPH_BASE}/${this.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        body,
        preview_url: false,
      },
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string; code?: number } };
      if (!res.ok) {
        const errMsg = data?.error?.message ?? res.statusText;
        console.error('[WhatsApp] API error:', errMsg, data?.error);
        return { error: errMsg };
      }
      const messageId = data?.messages?.[0]?.id ?? null;
      return messageId ? { messageId } : null;
    } catch (err) {
      console.error('[WhatsApp] send failed:', err);
      return { error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  /**
   * Envoie un message template (obligatoire pour le premier contact avec un utilisateur).
   * Ex. hello_world (sans paramètre) ou invitation_activation avec {{1}} = lien.
   */
  async sendTemplate(
    toPhone: string,
    templateName: string,
    languageCode: string,
    bodyParams?: string[],
  ): Promise<{ messageId: string } | { error: string } | null> {
    if (!this.isConfigured()) return null;
    const to = this.normalizePhone(toPhone);
    console.log('[WhatsApp] Template vers:', to, 'template:', templateName);
    const url = `${GRAPH_BASE}/${this.phoneNumberId}/messages`;
    const template: Record<string, unknown> = {
      name: templateName,
      language: { code: languageCode },
    };
    if (bodyParams && bodyParams.length > 0) {
      template.components = [
        {
          type: 'body',
          parameters: bodyParams.map((text) => ({ type: 'text' as const, text })),
        },
      ];
    }
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template,
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };
      if (!res.ok) {
        const errMsg = data?.error?.message ?? res.statusText;
        console.error('[WhatsApp] Template API error:', errMsg, data?.error);
        return { error: errMsg };
      }
      const messageId = data?.messages?.[0]?.id ?? null;
      return messageId ? { messageId } : null;
    } catch (err) {
      console.error('[WhatsApp] send template failed:', err);
      return { error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }
}
