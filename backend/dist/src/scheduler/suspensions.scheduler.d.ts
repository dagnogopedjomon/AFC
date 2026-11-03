import { ContributionsService } from '../contributions/contributions.service';
import { JekoService } from '../contributions/jeko.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegularizationsService } from '../regularizations/regularizations.service';
import { MembersService } from '../members/members.service';
export declare class SuspensionsScheduler {
    private readonly contributionsService;
    private readonly jekoService;
    private readonly notifications;
    private readonly regularizations;
    private readonly members;
    private readonly logger;
    constructor(contributionsService: ContributionsService, jekoService: JekoService, notifications: NotificationsService, regularizations: RegularizationsService, members: MembersService);
    handleProspectPromotions(): Promise<void>;
    handleDueDateReminders(): Promise<void>;
    handleDailySuspensions(): Promise<void>;
    handleRegularizationDeadlines(): Promise<void>;
    handleReactivationDeadline(): Promise<void>;
    handleCleanExpiredJekoPending(): Promise<void>;
    handleMonthlyReminderDay1(): Promise<void>;
    handleMonthlyReminderDay5(): Promise<void>;
    private sendMonthlyReminders;
}
