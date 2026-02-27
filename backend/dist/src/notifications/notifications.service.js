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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_service_1 = require("./whatsapp.service");
const sms_service_1 = require("./sms.service");
const client_1 = require("@prisma/client");
let NotificationsService = class NotificationsService {
    prisma;
    whatsapp;
    sms;
    constructor(prisma, whatsapp, sms) {
        this.prisma = prisma;
        this.whatsapp = whatsapp;
        this.sms = sms;
    }
    async log(memberId, channel, type, payload) {
        return this.prisma.notificationLog.create({
            data: {
                memberId,
                channel,
                type,
                payload: payload ? JSON.stringify(payload) : null,
            },
        });
    }
    async sendCotisationReminder(memberId, periodLabel) {
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { phone: true, firstName: true, lastName: true },
        });
        if (!member)
            throw new common_1.NotFoundException('Membre introuvable');
        const text = `Bonjour ${member.firstName},\n\nRappel : votre cotisation pour ${periodLabel} est attendue. Merci de régler au plus tôt.\n\n— Amicale AFC`;
        let whatsappMessageId;
        if (this.whatsapp.isConfigured()) {
            const result = await this.whatsapp.sendText(member.phone, text);
            whatsappMessageId = result != null && 'messageId' in result ? result.messageId : undefined;
        }
        await this.log(memberId, client_1.NotificationChannel.WHATSAPP, 'RAPPEL_COTISATION', {
            period: periodLabel,
            sentAt: new Date().toISOString(),
            whatsappMessageId: whatsappMessageId ?? undefined,
        });
        return {
            ok: true,
            message: this.whatsapp.isConfigured()
                ? (whatsappMessageId ? 'Rappel envoyé par WhatsApp.' : 'Envoi WhatsApp échoué, log enregistré.')
                : 'Rappel enregistré (WhatsApp non configuré).',
        };
    }
    async sendPaymentConfirmation(memberId, amount, periodLabel) {
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { phone: true, firstName: true },
        });
        if (!member)
            throw new common_1.NotFoundException('Membre introuvable');
        const text = `Bonjour ${member.firstName},\n\nNous confirmons la réception de votre paiement de ${amount} € pour ${periodLabel}. Merci !\n\n— Amicale AFC`;
        let whatsappMessageId;
        if (this.whatsapp.isConfigured()) {
            const result = await this.whatsapp.sendText(member.phone, text);
            whatsappMessageId = result != null && 'messageId' in result ? result.messageId : undefined;
        }
        await this.log(memberId, client_1.NotificationChannel.WHATSAPP, 'CONFIRMATION_PAIEMENT', {
            amount,
            period: periodLabel,
            sentAt: new Date().toISOString(),
            whatsappMessageId: whatsappMessageId ?? undefined,
        });
        return {
            ok: true,
            message: this.whatsapp.isConfigured()
                ? (whatsappMessageId ? 'Confirmation envoyée par WhatsApp.' : 'Envoi WhatsApp échoué, log enregistré.')
                : 'Confirmation enregistrée (WhatsApp non configuré).',
        };
    }
    async sendActivationInvite(memberId, phone, activationLink) {
        const text = `Vous avez été ajouté à l'amicale AFC. Cliquez pour activer : ${activationLink} — Amicale AFC`;
        const channel = this.sms.isConfigured() ? client_1.NotificationChannel.SMS : client_1.NotificationChannel.WHATSAPP;
        if (this.sms.isConfigured()) {
            await this.sms.send(phone, text);
            return { ok: true };
        }
        if (this.whatsapp.isConfigured()) {
            const templateName = process.env.WHATSAPP_INVITATION_TEMPLATE_NAME;
            const templateLang = process.env.WHATSAPP_INVITATION_TEMPLATE_LANGUAGE || 'en_US';
            let result;
            if (templateName) {
                const hasLink = process.env.WHATSAPP_INVITATION_TEMPLATE_HAS_LINK === 'true';
                const bodyParams = hasLink ? [activationLink] : [];
                result = await this.whatsapp.sendTemplate(phone, templateName, templateLang, bodyParams);
            }
            else {
                result = await this.whatsapp.sendText(phone, text);
            }
            const whatsappSent = result != null && 'messageId' in result && !!result.messageId;
            const whatsappError = result != null && 'error' in result ? result.error : undefined;
            await this.log(memberId, channel, 'INVITATION_ACTIVATION', {
                activationLink,
                sentAt: new Date().toISOString(),
                whatsappSent,
                whatsappError,
            });
            return { ok: true, whatsappSent, whatsappError };
        }
        await this.log(memberId, channel, 'INVITATION_ACTIVATION', {
            activationLink,
            sentAt: new Date().toISOString(),
        });
        return { ok: true };
    }
    async sendActivationOtp(phone, code) {
        const text = `Votre code d'activation AFC : ${code}. Valide 15 min. Ne partagez pas. — Amicale AFC`;
        if (this.sms.isConfigured()) {
            await this.sms.send(phone, text);
        }
        else if (this.whatsapp.isConfigured()) {
            await this.whatsapp.sendText(phone, text);
        }
        return { ok: true };
    }
    getWhatsAppStatus() {
        return {
            whatsappConfigured: this.whatsapp.isConfigured(),
            smsConfigured: this.sms.isConfigured(),
        };
    }
    async getLogs(memberId, limit = 50) {
        return this.prisma.notificationLog.findMany({
            where: memberId ? { memberId } : undefined,
            orderBy: { sentAt: 'desc' },
            take: limit,
            include: { member: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        });
    }
    async createInApp(memberId, message, title) {
        return this.prisma.inAppNotification.create({
            data: { memberId, message, title: title ?? null },
        });
    }
    async createInAppBulk(memberIds, message, title) {
        if (memberIds.length === 0)
            return { count: 0 };
        await this.prisma.inAppNotification.createMany({
            data: memberIds.map((memberId) => ({
                memberId,
                message,
                title: title ?? null,
            })),
        });
        return { count: memberIds.length };
    }
    async getInAppForMember(memberId, limit = 50) {
        return this.prisma.inAppNotification.findMany({
            where: { memberId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async getInAppUnreadCount(memberId) {
        return this.prisma.inAppNotification.count({
            where: { memberId, read: false },
        });
    }
    async markInAppAsRead(id, memberId) {
        return this.prisma.inAppNotification.updateMany({
            where: { id, memberId },
            data: { read: true },
        });
    }
    async markAllInAppAsRead(memberId) {
        return this.prisma.inAppNotification.updateMany({
            where: { memberId },
            data: { read: true },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsappService,
        sms_service_1.SmsService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map