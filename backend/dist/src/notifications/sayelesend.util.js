"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeE164 = normalizeE164;
exports.sayelesendSend = sayelesendSend;
const SAYELESEND_BASE = 'https://api.sayelesend.com';
const SAYELESEND_SEND_URL = `${SAYELESEND_BASE}/api/v1/sms/send`;
function normalizeE164(phone) {
    const digits = phone.replace(/\D/g, '');
    const countryCode = process.env.COUNTRY_CODE || '225';
    if (digits.startsWith('225') && digits.length >= 11)
        return '+' + digits;
    if (digits.startsWith('33') && digits.length === 11)
        return '+' + digits;
    if (countryCode === '225') {
        if (digits.length === 10 && digits.startsWith('0'))
            return '+225' + digits;
        if (digits.length === 10)
            return '+225' + digits;
        return '+' + countryCode + digits;
    }
    if (digits.startsWith('0') && digits.length === 10) {
        return '+' + countryCode + digits.slice(1);
    }
    return '+' + countryCode + digits;
}
async function sayelesendSend(opts) {
    const { apiKey, to, message, channel, from, scheduledAt, logPrefix = '[Sayelesend]' } = opts;
    const payload = { to, message, channel };
    if (from)
        payload.from = from;
    if (scheduledAt)
        payload.scheduledAt = scheduledAt;
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
        const data = (await res.json().catch(() => ({})));
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
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Erreur réseau';
        console.error(`${logPrefix} fetch failed:`, errMsg);
        return { error: errMsg };
    }
}
//# sourceMappingURL=sayelesend.util.js.map