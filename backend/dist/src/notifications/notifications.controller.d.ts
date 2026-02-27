import { NotificationsService } from './notifications.service';
import { ContributionsService } from '../contributions/contributions.service';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly contributionsService;
    constructor(notificationsService: NotificationsService, contributionsService: ContributionsService);
    remindCotisation(body: {
        memberId: string;
        periodLabel: string;
    }): Promise<{
        ok: boolean;
        message: string;
    }>;
    remindAllArrears(body: {
        year?: number;
        month?: number;
        message: string;
        title?: string;
    }): Promise<{
        sent: number;
        total: number;
        message: string;
    }>;
    getInApp(user: RequestUser, limit?: string): Promise<{
        id: string;
        createdAt: Date;
        memberId: string;
        title: string | null;
        message: string;
        read: boolean;
    }[]>;
    getInAppUnreadCount(user: RequestUser): Promise<{
        count: number;
    }>;
    markInAppAsRead(id: string, user: RequestUser): Promise<import("@prisma/client").Prisma.BatchPayload>;
    markAllInAppAsRead(user: RequestUser): Promise<import("@prisma/client").Prisma.BatchPayload>;
    confirmPayment(body: {
        memberId: string;
        amount: number;
        periodLabel: string;
    }): Promise<{
        ok: boolean;
        message: string;
    }>;
    getStatus(): {
        whatsappConfigured: boolean;
        smsConfigured: boolean;
    };
    getLogs(memberId?: string, limit?: string): Promise<({
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
}
