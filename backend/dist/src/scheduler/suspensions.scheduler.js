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
var SuspensionsScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuspensionsScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const contributions_service_1 = require("../contributions/contributions.service");
const jeko_service_1 = require("../contributions/jeko.service");
const notifications_service_1 = require("../notifications/notifications.service");
const regularizations_service_1 = require("../regularizations/regularizations.service");
const members_service_1 = require("../members/members.service");
let SuspensionsScheduler = SuspensionsScheduler_1 = class SuspensionsScheduler {
    contributionsService;
    jekoService;
    notifications;
    regularizations;
    members;
    logger = new common_1.Logger(SuspensionsScheduler_1.name);
    constructor(contributionsService, jekoService, notifications, regularizations, members) {
        this.contributionsService = contributionsService;
        this.jekoService = jekoService;
        this.notifications = notifications;
        this.regularizations = regularizations;
        this.members = members;
    }
    async handleProspectPromotions() {
        try {
            await this.members.promoteEligibleProspects();
        }
        catch (err) {
            this.logger.error('Erreur promotion des prospects:', err);
        }
    }
    async handleDueDateReminders() {
        try {
            const now = new Date();
            const { members } = await this.contributionsService.getMembersInArrears(now.getFullYear(), now.getMonth() + 1);
            if (members.length === 0)
                return;
            const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
            const lastDay = now.getDate() === 10;
            await this.notifications.createInAppBulk(members.map((m) => m.id), lastDay
                ? `Dernier jour pour régler votre cotisation de ${monthLabel}. Passé ce délai, votre compte sera suspendu.`
                : `Votre cotisation de ${monthLabel} est à régler avant le 10 pour éviter la suspension de votre compte.`, lastDay ? 'Échéance aujourd’hui' : 'Cotisation à régler');
            console.log(`[Scheduler] Rappels d'échéance envoyés: ${members.length} membre(s)`);
        }
        catch (err) {
            console.error('[Scheduler] Erreur rappels d\'échéance:', err);
        }
    }
    async handleDailySuspensions() {
        try {
            const result = await this.contributionsService.applySuspensions();
            if (result.applied > 0) {
                console.log(`[Scheduler] Suspensions appliquées: ${result.applied} membre(s)`);
            }
        }
        catch (err) {
            console.error('[Scheduler] Erreur applySuspensions:', err);
        }
    }
    async handleRegularizationDeadlines() {
        try {
            const result = await this.regularizations.reapplyOverdueSuspensions();
            if (result.applied > 0)
                this.logger.log(`Régularisations échues : ${result.applied} membre(s) re-suspendu(s).`);
        }
        catch (err) {
            this.logger.error('Erreur regularization deadlines:', err);
        }
    }
    async handleReactivationDeadline() {
        try {
            const result = await this.contributionsService.reapplySuspensionsAfterReactivationDeadline();
            if (result.applied > 0) {
                console.log(`[Scheduler] Re-suspensions (délai 24h): ${result.applied} membre(s)`);
            }
        }
        catch (err) {
            console.error('[Scheduler] Erreur reapplySuspensionsAfterReactivationDeadline:', err);
        }
    }
    async handleCleanExpiredJekoPending() {
        try {
            const count = await this.jekoService.cleanExpired();
            if (count > 0) {
                this.logger.log(`PendingJekoPayment expirés supprimés: ${count}`);
            }
        }
        catch (err) {
            this.logger.error('Erreur cleanExpiredJekoPending:', err);
        }
    }
    async handleMonthlyReminderDay1() {
        await this.sendMonthlyReminders('J1');
    }
    async handleMonthlyReminderDay5() {
        await this.sendMonthlyReminders('J5');
    }
    async sendMonthlyReminders(tag) {
        if (!this.jekoService.isConfigured()) {
            this.logger.warn(`[Relance ${tag}] Jeko non configuré, relance ignorée.`);
            return;
        }
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        const monthly = await this.contributionsService.findActiveMonthlyCotisation();
        if (!monthly) {
            this.logger.warn(`[Relance ${tag}] Aucune cotisation mensuelle active.`);
            return;
        }
        if (!this.notifications.isEmailConfigured()) {
            this.logger.warn(`[Relance ${tag}] E-mail non configuré et SMS désactivé : relance ignorée.`);
            return;
        }
        const unpaidMembers = (await this.contributionsService.findUnpaidMembersForMonth(year, month, monthly.id)).filter((m) => !!m.email);
        this.logger.log(`[Relance ${tag}] ${unpaidMembers.length} membre(s) impayés pour ${monthLabel}`);
        let sent = 0;
        for (const member of unpaidMembers) {
            try {
                const { redirectUrl } = await this.jekoService.createPaymentRequest({
                    amountFcfa: Number(monthly.amount),
                    memberId: member.id,
                    contributionId: monthly.id,
                    periodYear: year,
                    periodMonth: month,
                    paymentMethod: 'wave',
                });
                await this.notifications.sendJekoPaymentReminder({
                    memberId: member.id,
                    periodLabel: monthLabel,
                    redirectUrl,
                    amountFcfa: Number(monthly.amount),
                });
                sent++;
            }
            catch (err) {
                this.logger.error(`[Relance ${tag}] Erreur pour membre ${member.id}:`, err);
            }
        }
        this.logger.log(`[Relance ${tag}] ${sent}/${unpaidMembers.length} relances envoyées.`);
    }
};
exports.SuspensionsScheduler = SuspensionsScheduler;
__decorate([
    (0, schedule_1.Cron)('10 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleProspectPromotions", null);
__decorate([
    (0, schedule_1.Cron)('0 8 7,10 * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleDueDateReminders", null);
__decorate([
    (0, schedule_1.Cron)('5 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleDailySuspensions", null);
__decorate([
    (0, schedule_1.Cron)('15 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleRegularizationDeadlines", null);
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleReactivationDeadline", null);
__decorate([
    (0, schedule_1.Cron)('0 2 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleCleanExpiredJekoPending", null);
__decorate([
    (0, schedule_1.Cron)('0 8 1 * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleMonthlyReminderDay1", null);
__decorate([
    (0, schedule_1.Cron)('0 8 5 * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleMonthlyReminderDay5", null);
exports.SuspensionsScheduler = SuspensionsScheduler = SuspensionsScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [contributions_service_1.ContributionsService,
        jeko_service_1.JekoService,
        notifications_service_1.NotificationsService,
        regularizations_service_1.RegularizationsService,
        members_service_1.MembersService])
], SuspensionsScheduler);
//# sourceMappingURL=suspensions.scheduler.js.map