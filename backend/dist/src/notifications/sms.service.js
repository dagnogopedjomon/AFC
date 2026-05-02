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
const sayelesend_util_1 = require("./sayelesend.util");
let SmsService = class SmsService {
    apiKey = process.env.SAYELESEND_API_KEY;
    from = process.env.SAYELESEND_SMS_FROM;
    isConfigured() {
        return Boolean(this.apiKey);
    }
    async send(toPhone, body) {
        if (!this.isConfigured())
            return null;
        const to = (0, sayelesend_util_1.normalizeE164)(toPhone);
        const result = await (0, sayelesend_util_1.sayelesendSend)({
            apiKey: this.apiKey,
            to,
            message: body,
            channel: 'sms',
            from: this.from,
            logPrefix: '[SMS/Sayelesend]',
        });
        if (!result || 'error' in result)
            return null;
        return { messageId: result.messageId };
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = __decorate([
    (0, common_1.Injectable)()
], SmsService);
//# sourceMappingURL=sms.service.js.map