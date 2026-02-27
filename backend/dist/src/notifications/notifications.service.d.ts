import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { SmsService } from './sms.service';
import { NotificationChannel } from '@prisma/client';
export declare class NotificationsService {
    private readonly prisma;
    private readonly whatsapp;
    private readonly sms;
    constructor(prisma: PrismaService, whatsapp: WhatsappService, sms: SmsService);
    log(memberId: string, channel: NotificationChannel, type: string, payload?: Record<string, unknown>): Promise<{
        id: string;
        memberId: string;
        type: string;
        sentAt: Date;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        payload: string | null;
    }>;
    sendCotisationReminder(memberId: string, periodLabel: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    sendPaymentConfirmation(memberId: string, amount: number, periodLabel: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    sendActivationInvite(memberId: string, phone: string, activationLink: string): Promise<{
        ok: boolean;
        whatsappSent?: boolean;
        whatsappError?: string;
    }>;
    sendActivationOtp(phone: string, code: string): Promise<{
        ok: boolean;
    }>;
    getWhatsAppStatus(): {
        whatsappConfigured: boolean;
        smsConfigured: boolean;
    };
    getLogs(memberId?: string, limit?: number): Promise<({
        member: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        memberId: string;
        type: string;
        sentAt: Date;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        payload: string | null;
    })[]>;
    createInApp(memberId: string, message: string, title?: string): Promise<{
        id: string;
        createdAt: Date;
        memberId: string;
        title: string | null;
        message: string;
        read: boolean;
    }>;
    createInAppBulk(memberIds: string[], message: string, title?: string): Promise<{
        count: number;
    }>;
    getInAppForMember(memberId: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        memberId: string;
        title: string | null;
        message: string;
        read: boolean;
    }[]>;
    getInAppUnreadCount(memberId: string): Promise<number>;
    markInAppAsRead(id: string, memberId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    markAllInAppAsRead(memberId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
