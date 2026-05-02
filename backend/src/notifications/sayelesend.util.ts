/**
 * Utilitaire partagé pour l'API Sayelesend.
 * Doc : https://api.sayelesend.com
 * Endpoint : POST /api/v1/sms/send
 * Body : { to, message, channel, from?, scheduledAt? }
 * Auth : Authorization: Bearer <SAYELESEND_API_KEY>
 * Réponse succès : { success: true, messageId: "...", status: "pending" }
 */

const SAYELESEND_BASE = 'https://api.sayelesend.com';
const SAYELESEND_SEND_URL = `${SAYELESEND_BASE}/api/v1/sms/send`;

export type SayelesendChannel = 'sms' | 'whatsapp' | 'telegram' | 'facebook_messenger';

export type SayelesendSendOptions = {
  apiKey: string;
  to: string;
  message: string;
  channel: SayelesendChannel;
  from?: string;
  scheduledAt?: number;
  logPrefix?: string;
};

export type SayelesendResult =
  | { messageId: string }
  | { error: string }
  | null;

/**
 * Normalise un numéro vers le format E.164 requis par Sayelesend (ex: +2250759928005).
 *
 * Règles :
 * - Chiffres uniquement, puis préfixe `+`
 * - Si déjà 11-15 chiffres avec indicatif international → on préfixe `+`
 * - Sinon on utilise COUNTRY_CODE (par défaut 225) pour préfixer :
 *   - Côte d'Ivoire (225) : "0759928005" ou "759928005" → +2250759928005 / +225759928005
 *     (on garde le 0 car les numéros CI à 10 chiffres commencent par 0)
 *   - France (33) : "0612345678" → +33612345678 (on retire le 0 initial)
 */
export function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const countryCode = process.env.COUNTRY_CODE || '225';

  // Déjà au format international connu
  if (digits.startsWith('225') && digits.length >= 11) return '+' + digits;
  if (digits.startsWith('33') && digits.length === 11) return '+' + digits;

  // Côte d'Ivoire : les numéros à 10 chiffres commencent par 0, on conserve le 0 derrière 225
  if (countryCode === '225') {
    if (digits.length === 10 && digits.startsWith('0')) return '+225' + digits;
    if (digits.length === 10) return '+225' + digits;
    return '+' + countryCode + digits;
  }

  // France (et autres où le 0 initial doit être retiré)
  if (digits.startsWith('0') && digits.length === 10) {
    return '+' + countryCode + digits.slice(1);
  }

  return '+' + countryCode + digits;
}

/** Envoi d'un message via Sayelesend. Retourne messageId en cas de succès. */
export async function sayelesendSend(
  opts: SayelesendSendOptions,
): Promise<SayelesendResult> {
  const { apiKey, to, message, channel, from, scheduledAt, logPrefix = '[Sayelesend]' } = opts;

  const payload: Record<string, unknown> = { to, message, channel };
  if (from) payload.from = from;
  if (scheduledAt) payload.scheduledAt = scheduledAt;

  console.log(`${logPrefix} Envoi`, { to, channel, from: from ?? null });

  try {
    const res = await fetch(SAYELESEND_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      messageId?: string;
      status?: string;
      error?: string;
      message?: string;
    };

    if (!res.ok || data.success === false) {
      const errMsg = data.error || data.message || `HTTP ${res.status}`;
      console.error(`${logPrefix} Erreur:`, errMsg, data);
      return { error: errMsg };
    }

    if (data.messageId) {
      console.log(`${logPrefix} OK — messageId:`, data.messageId, 'status:', data.status ?? '—');
      return { messageId: data.messageId };
    }

    console.warn(`${logPrefix} Réponse sans messageId:`, data);
    return null;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Erreur réseau';
    console.error(`${logPrefix} fetch failed:`, errMsg);
    return { error: errMsg };
  }
}
