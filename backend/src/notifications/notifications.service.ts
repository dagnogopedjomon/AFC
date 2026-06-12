import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { SmsService } from './sms.service';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly sms: SmsService,
  ) {}

  private isEmailConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isEmailConfigured()) return false;
    try {
      const transporter = createTransport({
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
    } catch (err) {
      this.logger.error(`[Email] Erreur envoi vers ${to}:`, err);
      return false;
    }
  }

  /**
   * Envoie une relance avec lien de paiement Jeko direct.
   * Canal SMS + Email (si dispo).
   */
  async sendJekoPaymentReminder(params: {
    memberId: string;
    periodLabel: string;
    redirectUrl: string;
    amountFcfa: number;
  }): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { id: params.memberId },
      select: { phone: true, email: true, firstName: true, lastName: true },
    });
    if (!member) return;

    const amount = params.amountFcfa.toLocaleString('fr-FR');
    const smsText =
      `AFC - Bonjour ${member.firstName}, votre cotisation ${params.periodLabel} (${amount} FCFA) est due.\n` +
      `Payez maintenant : ${params.redirectUrl}\n— Amicale AFC`;

    // SMS
    let smsSent = false;
    if (this.sms.isConfigured()) {
      const r = await this.sms.send(member.phone, smsText);
      smsSent = !!r?.messageId;
    }

    // Email
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

    await this.log(params.memberId, NotificationChannel.SMS, 'RELANCE_JEKO', {
      period: params.periodLabel,
      amount: params.amountFcfa,
      redirectUrl: params.redirectUrl,
      smsSent,
      emailSent,
      sentAt: new Date().toISOString(),
    });
  }

  /**
   * Confirmation de paiement après webhook Jeko (SMS + email).
   */
  async sendJekoPaymentConfirmation(params: {
    memberId: string;
    amountFcfa: number;
    periodLabel?: string;
  }): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { id: params.memberId },
      select: { phone: true, email: true, firstName: true, lastName: true },
    });
    if (!member) return;

    const amount = params.amountFcfa.toLocaleString('fr-FR');
    const period = params.periodLabel ? ` pour ${params.periodLabel}` : '';
    const smsText = `AFC - Bonjour ${member.firstName}, votre paiement${period} de ${amount} FCFA a bien été reçu. Merci ! — Amicale AFC`;

    if (this.sms.isConfigured()) {
      await this.sms.send(member.phone, smsText);
    }

    if (member.email && this.isEmailConfigured()) {
      const html = `
        <p>Bonjour <strong>${member.firstName} ${member.lastName}</strong>,</p>
        <p>Votre paiement${period} de <strong>${amount} FCFA</strong> a bien été enregistré. Merci !</p>
        <p>— Amicale AFC</p>
      `;
      await this.sendEmail(member.email, `AFC – Paiement confirmé`, html);
    }

    await this.log(params.memberId, NotificationChannel.SMS, 'CONFIRMATION_JEKO', {
      amount: params.amountFcfa,
      period: params.periodLabel,
      sentAt: new Date().toISOString(),
    });
  }

  async log(
    memberId: string,
    channel: NotificationChannel,
    type: string,
    payload?: Record<string, unknown>,
  ) {
    return this.prisma.notificationLog.create({
      data: {
        memberId,
        channel,
        type,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });
  }

  async sendCotisationReminder(memberId: string, periodLabel: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { phone: true, firstName: true, lastName: true },
    });
    if (!member) throw new NotFoundException('Membre introuvable');
    const text = `Bonjour ${member.firstName},\n\nRappel : votre cotisation pour ${periodLabel} est attendue. Merci de régler au plus tôt.\n\n— Amicale AFC`;
    let whatsappMessageId: string | undefined;
    if (this.whatsapp.isConfigured()) {
      const result = await this.whatsapp.sendText(member.phone, text);
      whatsappMessageId = result != null && 'messageId' in result ? result.messageId : undefined;
    }
    await this.log(memberId, NotificationChannel.WHATSAPP, 'RAPPEL_COTISATION', {
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

  async sendPaymentConfirmation(memberId: string, amount: number, periodLabel: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { phone: true, firstName: true },
    });
    if (!member) throw new NotFoundException('Membre introuvable');
    const text = `Bonjour ${member.firstName},\n\nNous confirmons la réception de votre paiement de ${amount} € pour ${periodLabel}. Merci !\n\n— Amicale AFC`;
    let whatsappMessageId: string | undefined;
    if (this.whatsapp.isConfigured()) {
      const result = await this.whatsapp.sendText(member.phone, text);
      whatsappMessageId = result != null && 'messageId' in result ? result.messageId : undefined;
    }
    await this.log(memberId, NotificationChannel.WHATSAPP, 'CONFIRMATION_PAIEMENT', {
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

  async sendActivationInvite(memberId: string, phone: string, activationLink: string): Promise<{
    ok: boolean;
    smsSent: boolean;
    smsError?: string;
  }> {
    const text = `Bienvenue à l'amicale AFC ! Activez votre compte en cliquant ici : ${activationLink}`;

    if (!this.sms.isConfigured()) {
      await this.log(memberId, NotificationChannel.SMS, 'INVITATION_ACTIVATION', {
        activationLink,
        sentAt: new Date().toISOString(),
        smsSent: false,
        smsError: 'SMS non configuré',
      });
      return { ok: true, smsSent: false, smsError: 'SMS non configuré' };
    }

    const result = await this.sms.send(phone, text);
    const smsSent = result != null && !!result.messageId;

    await this.log(memberId, NotificationChannel.SMS, 'INVITATION_ACTIVATION', {
      activationLink,
      sentAt: new Date().toISOString(),
      smsSent,
    });

    if (!smsSent) {
      return { ok: true, smsSent: false, smsError: 'Échec envoi SMS' };
    }
    return { ok: true, smsSent: true };
  }

  async sendActivationOtp(phone: string, code: string) {
    const text = `Votre code d'activation AFC : ${code}. Valide 15 min. Ne partagez pas.`;
    if (this.sms.isConfigured()) {
      await this.sms.send(phone, text);
    }
    return { ok: true };
  }

  getWhatsAppStatus(): { whatsappConfigured: boolean; smsConfigured: boolean } {
    return {
      whatsappConfigured: this.whatsapp.isConfigured(),
      smsConfigured: this.sms.isConfigured(),
    };
  }

  async getLogs(memberId?: string, limit = 50) {
    return this.prisma.notificationLog.findMany({
      where: memberId ? { memberId } : undefined,
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: { member: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
  }

  // ——— Notifications in-app (message du bureau aux membres) ———

  async createInApp(memberId: string, message: string, title?: string) {
    return this.prisma.inAppNotification.create({
      data: { memberId, message, title: title ?? null },
    });
  }

  async createInAppBulk(memberIds: string[], message: string, title?: string) {
    if (memberIds.length === 0) return { count: 0 };
    await this.prisma.inAppNotification.createMany({
      data: memberIds.map((memberId) => ({
        memberId,
        message,
        title: title ?? null,
      })),
    });
    return { count: memberIds.length };
  }

  async getInAppForMember(memberId: string, limit = 50) {
    return this.prisma.inAppNotification.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getInAppUnreadCount(memberId: string) {
    return this.prisma.inAppNotification.count({
      where: { memberId, read: false },
    });
  }

  async markInAppAsRead(id: string, memberId: string) {
    return this.prisma.inAppNotification.updateMany({
      where: { id, memberId },
      data: { read: true },
    });
  }

  async markAllInAppAsRead(memberId: string) {
    return this.prisma.inAppNotification.updateMany({
      where: { memberId },
      data: { read: true },
    });
  }
}
