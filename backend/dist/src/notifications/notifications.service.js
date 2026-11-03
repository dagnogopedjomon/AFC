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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer_1 = require("nodemailer");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_service_1 = require("./whatsapp.service");
const sms_service_1 = require("./sms.service");
const client_1 = require("@prisma/client");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    whatsapp;
    sms;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(prisma, whatsapp, sms) {
        this.prisma = prisma;
        this.whatsapp = whatsapp;
        this.sms = sms;
    }
    isEmailConfigured() {
        return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    }
    async sendEmail(to, subject, html) {
        if (!this.isEmailConfigured())
            return false;
        try {
            const transporter = (0, nodemailer_1.createTransport)({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT ?? 587),
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            await transporter.sendMail({
                from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
                to,
                subject,
                html,
            });
            return true;
        }
        catch (err) {
            this.logger.error(`[Email] Erreur envoi vers ${to}:`, err);
            return false;
        }
    }
    async sendJekoPaymentReminder(params) {
        const member = await this.prisma.member.findUnique({
            where: { id: params.memberId },
            select: { phone: true, email: true, firstName: true, lastName: true },
        });
        if (!member)
            return;
        const amount = params.amountFcfa.toLocaleString('fr-FR');
        const smsSent = false;
        let emailSent = false;
        if (member.email && this.isEmailConfigured()) {
            const html = `
        <p>Bonjour <strong>${member.firstName} ${member.lastName}</strong>,</p>
        <p>Votre cotisation <strong>${params.periodLabel}</strong> d'un montant de <strong>${amount} FCFA</strong> est attendue.</p>
        <p><a href="${params.redirectUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          Payer maintenant
        </a></p>
        <p style="color:#888;font-size:12px;">Si le bouton ne fonctionne pas : ${params.redirectUrl}</p>
        <p>— Amicale AFC</p>
      `;
            emailSent = await this.sendEmail(member.email, `AFC – Cotisation ${params.periodLabel}`, html);
        }
        await this.log(params.memberId, client_1.NotificationChannel.SMS, 'RELANCE_JEKO', {
            period: params.periodLabel,
            amount: params.amountFcfa,
            redirectUrl: params.redirectUrl,
            smsSent,
            emailSent,
            sentAt: new Date().toISOString(),
        });
    }
    async sendJekoPaymentConfirmation(params) {
        const member = await this.prisma.member.findUnique({
            where: { id: params.memberId },
            select: { phone: true, email: true, firstName: true, lastName: true },
        });
        if (!member)
            return;
        const amount = params.amountFcfa.toLocaleString('fr-FR');
        const period = params.periodLabel ? ` pour ${params.periodLabel}` : '';
        if (member.email && this.isEmailConfigured()) {
            const html = `
        <p>Bonjour <strong>${member.firstName} ${member.lastName}</strong>,</p>
        <p>Votre paiement${period} de <strong>${amount} FCFA</strong> a bien été enregistré. Merci !</p>
        <p>— Amicale AFC</p>
      `;
            await this.sendEmail(member.email, `AFC – Paiement confirmé`, html);
        }
        await this.log(params.memberId, client_1.NotificationChannel.SMS, 'CONFIRMATION_JEKO', {
            amount: params.amountFcfa,
            period: params.periodLabel,
            sentAt: new Date().toISOString(),
        });
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
        await this.createInApp(memberId, `Votre cotisation pour ${periodLabel} est attendue. Merci de la régler au plus tôt depuis l'application.`, 'Rappel de cotisation');
        await this.log(memberId, client_1.NotificationChannel.SMS, 'RAPPEL_COTISATION', {
            period: periodLabel,
            sentAt: new Date().toISOString(),
            smsSent: false,
            inApp: true,
        });
        return { ok: true, message: 'Rappel envoyé au membre (notification dans l\'application).' };
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
        const text = `Bienvenue à l'amicale AFC ! Activez votre compte en cliquant ici : ${activationLink}`;
        if (!this.sms.isConfigured()) {
            await this.log(memberId, client_1.NotificationChannel.SMS, 'INVITATION_ACTIVATION', {
                activationLink,
                sentAt: new Date().toISOString(),
                smsSent: false,
                smsError: 'SMS non configuré',
            });
            return { ok: true, smsSent: false, smsError: 'SMS non configuré' };
        }
        const result = await this.sms.send(phone, text);
        const smsSent = result != null && !!result.messageId;
        await this.log(memberId, client_1.NotificationChannel.SMS, 'INVITATION_ACTIVATION', {
            activationLink,
            sentAt: new Date().toISOString(),
            smsSent,
        });
        if (!smsSent) {
            return { ok: true, smsSent: false, smsError: 'Échec envoi SMS' };
        }
        return { ok: true, smsSent: true };
    }
    async sendActivationOtp(phone, code) {
        const text = `Votre code d'activation AFC : ${code}. Valide 15 min. Ne partagez pas.`;
        if (this.sms.isConfigured()) {
            await this.sms.send(phone, text);
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
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsappService,
        sms_service_1.SmsService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map