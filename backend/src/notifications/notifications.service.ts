import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { SmsService } from './sms.service';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly sms: SmsService,
  ) {}

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
    whatsappSent?: boolean;
    whatsappError?: string;
  }> {
    const text = `Vous avez été ajouté à l'amicale AFC. Cliquez pour activer : ${activationLink} — Amicale AFC`;
    const channel = this.sms.isConfigured() ? NotificationChannel.SMS : NotificationChannel.WHATSAPP;
    if (this.sms.isConfigured()) {
      await this.sms.send(phone, text);
      return { ok: true };
    }
    if (this.whatsapp.isConfigured()) {
      const templateName = process.env.WHATSAPP_INVITATION_TEMPLATE_NAME;
      const templateLang = process.env.WHATSAPP_INVITATION_TEMPLATE_LANGUAGE || 'en_US';
      let result: { messageId?: string; error?: string } | null;
      if (templateName) {
        const hasLink = process.env.WHATSAPP_INVITATION_TEMPLATE_HAS_LINK === 'true';
        const bodyParams = hasLink ? [activationLink] : [];
        result = await this.whatsapp.sendTemplate(phone, templateName, templateLang, bodyParams);
      } else {
        result = await this.whatsapp.sendText(phone, text);
      }
      const whatsappSent =
        result != null && 'messageId' in result && !!result.messageId;
      const whatsappError =
        result != null && 'error' in result ? result.error : undefined;
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

  async sendActivationOtp(phone: string, code: string) {
    const text = `Votre code d'activation AFC : ${code}. Valide 15 min. Ne partagez pas. — Amicale AFC`;
    if (this.sms.isConfigured()) {
      await this.sms.send(phone, text);
    } else if (this.whatsapp.isConfigured()) {
      await this.whatsapp.sendText(phone, text);
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
