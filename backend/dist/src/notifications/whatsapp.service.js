"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const GRAPH_API_VERSION = 'v18.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
let WhatsappService = class WhatsappService {
    accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    isConfigured() {
        return Boolean(this.accessToken && this.phoneNumberId);
    }
    normalizePhone(phone) {
        const digits = phone.replace(/\D/g, '');
        const countryCode = process.env.COUNTRY_CODE || '33';
        if (digits.startsWith('0') && digits.length === 10) {
            return countryCode + digits.slice(1);
        }
        if (digits.startsWith('33') && digits.length === 11)
            return digits;
        if (digits.startsWith('225') && digits.length >= 11)
            return digits;
        return digits;
    }
    async sendText(toPhone, body) {
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
            const data = (await res.json());
            if (!res.ok) {
                const errMsg = data?.error?.message ?? res.statusText;
                console.error('[WhatsApp] API error:', errMsg, data?.error);
                return { error: errMsg };
            }
            const messageId = data?.messages?.[0]?.id ?? null;
            return messageId ? { messageId } : null;
        }
        catch (err) {
            console.error('[WhatsApp] send failed:', err);
            return { error: err instanceof Error ? err.message : 'Erreur réseau' };
        }
    }
    async sendTemplate(toPhone, templateName, languageCode, bodyParams) {
        if (!this.isConfigured())
            return null;
        const to = this.normalizePhone(toPhone);
        console.log('[WhatsApp] Template vers:', to, 'template:', templateName);
        const url = `${GRAPH_BASE}/${this.phoneNumberId}/messages`;
        const template = {
            name: templateName,
            language: { code: languageCode },
        };
        if (bodyParams && bodyParams.length > 0) {
            template.components = [
                {
                    type: 'body',
                    parameters: bodyParams.map((text) => ({ type: 'text', text })),
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
            const data = (await res.json());
            if (!res.ok) {
                const errMsg = data?.error?.message ?? res.statusText;
                console.error('[WhatsApp] Template API error:', errMsg, data?.error);
                return { error: errMsg };
            }
            const messageId = data?.messages?.[0]?.id ?? null;
            return messageId ? { messageId } : null;
        }
        catch (err) {
            console.error('[WhatsApp] send template failed:', err);
            return { error: err instanceof Error ? err.message : 'Erreur réseau' };
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = __decorate([
    (0, common_1.Injectable)()
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map