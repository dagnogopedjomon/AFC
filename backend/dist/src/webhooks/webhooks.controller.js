"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebhooksController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const public_decorator_1 = require("../auth/public.decorator");
const jeko_service_1 = require("../contributions/jeko.service");
const notifications_service_1 = require("../notifications/notifications.service");
let WebhooksController = WebhooksController_1 = class WebhooksController {
    jekoService;
    notifications;
    logger = new common_1.Logger(WebhooksController_1.name);
    webhookSecret = process.env.JEKO_WEBHOOK_SECRET ?? '';
    constructor(jekoService, notifications) {
        this.jekoService = jekoService;
        this.notifications = notifications;
    }
    async handleJeko(req, res) {
        const signature = req.headers['jeko-signature'];
        if (!signature || !this.webhookSecret) {
            this.logger.warn('[Webhook Jeko] Signature manquante ou secret non configuré');
            return res.status(400).json({ error: 'Missing signature' });
        }
        const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
        const expected = (0, crypto_1.createHmac)('sha256', this.webhookSecret).update(rawBody).digest('hex');
        let signaturesMatch;
        try {
            signaturesMatch = (0, crypto_1.timingSafeEqual)(Buffer.from(signature), Buffer.from(expected));
        }
        catch {
            signaturesMatch = false;
        }
        if (!signaturesMatch) {
            this.logger.warn('[Webhook Jeko] Signature invalide');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        const payload = req.body;
        const reference = payload.transactionDetails?.reference;
        const paymentLinkId = payload.transactionDetails?.paymentLinkId;
        this.logger.log(`[Webhook Jeko] event reçu: ${payload.transactionType} / ${payload.status} / ref=${reference ?? '-'} / linkId=${paymentLinkId ?? '-'}`);
        if (payload.transactionType !== 'payment' || payload.status !== 'success') {
            return res.status(200).json({ received: true, processed: false });
        }
        if (!reference && !paymentLinkId) {
            this.logger.warn('[Webhook Jeko] Pas de référence ni de paymentLinkId dans transactionDetails');
            return res.status(200).json({ received: true, processed: false });
        }
        try {
            const result = reference
                ? await this.jekoService.recordFromWebhook(reference)
                : await this.jekoService.recordFromWebhookByLinkId(paymentLinkId);
            this.logger.log(`[Webhook Jeko] ${result.recorded ? 'Paiement enregistré' : 'Déjà traité'} pour ref=${reference ?? paymentLinkId}`);
            if (result.recorded && result.context) {
                const amountFcfa = result.context.amountFcfa;
                const periodLabel = (result.context.periodYear && result.context.periodMonth)
                    ? new Date(result.context.periodYear, result.context.periodMonth - 1)
                        .toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
                    : undefined;
                this.notifications.sendJekoPaymentConfirmation({
                    memberId: result.context.memberId,
                    amountFcfa,
                    periodLabel,
                }).catch((e) => this.logger.error('[Webhook Jeko] Erreur confirmation:', e));
            }
            return res.status(200).json({ received: true, processed: result.recorded });
        }
        catch (err) {
            this.logger.error('[Webhook Jeko] Erreur lors de l\'enregistrement:', err);
            return res.status(200).json({ received: true, processed: false, error: String(err) });
        }
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('jeko'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleJeko", null);
exports.WebhooksController = WebhooksController = WebhooksController_1 = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [jeko_service_1.JekoService,
        notifications_service_1.NotificationsService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map