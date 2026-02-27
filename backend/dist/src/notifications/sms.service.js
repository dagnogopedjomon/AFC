"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
let SmsService = class SmsService {
    apiUrl = (process.env.WIREPICK_API_URL || '').replace(/\/$/, '');
    client = process.env.WIREPICK_CLIENT;
    password = process.env.WIREPICK_PASSWORD;
    from = process.env.WIREPICK_FROM;
    isConfigured() {
        return Boolean(this.apiUrl && this.client && this.password && this.from);
    }
    normalizePhone(phone) {
        const digits = phone.replace(/\D/g, '');
        const countryCode = process.env.COUNTRY_CODE || '33';
        if (digits.startsWith('0') && digits.length === 10) {
            if (countryCode === '225') {
                return countryCode + digits;
            }
            return countryCode + digits.slice(1);
        }
        if (digits.startsWith('33') && digits.length === 11)
            return digits;
        if (digits.startsWith('225') && digits.length >= 11)
            return digits;
        return digits;
    }
    parseXmlResponse(xml) {
        const statusMatch = xml.match(/<status>([^<]*)<\/status>/i);
        const msgidMatch = xml.match(/<msgid>([^<]*)<\/msgid>/i);
        return {
            status: statusMatch ? statusMatch[1].trim() : undefined,
            msgid: msgidMatch ? msgidMatch[1].trim() : undefined,
        };
    }
    async send(toPhone, body) {
        if (!this.isConfigured())
            return null;
        const to = this.normalizePhone(toPhone);
        const url = `${this.apiUrl}/api/call`;
        console.log('[SMS/Wirepick] Envoi vers:', to, '(FROM=' + this.from + ')');
        const params = new URLSearchParams({
            client: this.client,
            password: this.password,
            phone: to,
            text: body,
            from: this.from,
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
            const success = parsed.status === '0' ||
                parsed.status?.toLowerCase() === 'ok' ||
                parsed.msgid != null;
            if (!success) {
                console.error('[SMS/Wirepick] Erreur vers', to, '— status:', parsed.status, 'body:', text.slice(0, 200));
                return null;
            }
            console.log('[SMS/Wirepick] Envoyé vers', to, '— msgid:', parsed.msgid ?? '—');
            return parsed.msgid ? { messageId: parsed.msgid } : { messageId: 'wirepick-' + Date.now() };
        }
        catch (err) {
            console.error('[SMS/Wirepick] send failed:', err);
            return null;
        }
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = __decorate([
    (0, common_1.Injectable)()
], SmsService);
//# sourceMappingURL=sms.service.js.map