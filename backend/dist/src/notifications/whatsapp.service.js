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
const sayelesend_util_1 = require("./sayelesend.util");
let WhatsappService = class WhatsappService {
    apiKey = process.env.SAYELESEND_API_KEY;
    from = process.env.SAYELESEND_WHATSAPP_FROM;
    isConfigured() {
        return Boolean(this.apiKey);
    }
    normalizePhone(phone) {
        return (0, sayelesend_util_1.normalizeE164)(phone);
    }
    async sendText(toPhone, body) {
        if (!this.isConfigured())
            return null;
        const to = (0, sayelesend_util_1.normalizeE164)(toPhone);
        const result = await (0, sayelesend_util_1.sayelesendSend)({
            apiKey: this.apiKey,
            to,
            message: body,
            channel: 'whatsapp',
            from: this.from,
            logPrefix: '[WhatsApp/Sayelesend]',
        });
        return result;
    }
    async sendTemplate(toPhone, templateName, _languageCode, bodyParams) {
        if (!this.isConfigured())
            return null;
        const body = bodyParams && bodyParams.length > 0
            ? bodyParams.join(' ')
            : templateName;
        return this.sendText(toPhone, body);
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = __decorate([
    (0, common_1.Injectable)()
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map