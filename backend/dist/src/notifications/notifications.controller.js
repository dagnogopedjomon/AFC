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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const contributions_service_1 = require("../contributions/contributions.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let NotificationsController = class NotificationsController {
    notificationsService;
    contributionsService;
    constructor(notificationsService, contributionsService) {
        this.notificationsService = notificationsService;
        this.contributionsService = contributionsService;
    }
    remindCotisation(body) {
        return this.notificationsService.sendCotisationReminder(body.memberId, body.periodLabel || 'mois en cours');
    }
    async remindAllArrears(body) {
        const now = new Date();
        const periodYear = body.year ?? now.getFullYear();
        const periodMonth = body.month ?? now.getMonth() + 1;
        const message = (body.message ?? '').trim();
        if (!message) {
            return { sent: 0, total: 0, message: 'Veuillez saisir un message.' };
        }
        const { members, total } = await this.contributionsService.getMembersInArrears(periodYear, periodMonth);
        const memberIds = members.map((m) => m.id);
        const { count } = await this.notificationsService.createInAppBulk(memberIds, message, body.title ?? 'Message du bureau');
        return {
            sent: count,
            total,
            message: total === 0
                ? 'Aucun membre en retard pour cette période.'
                : `${count} notification(s) envoyée(s) à ${total} membre(s) en retard.`,
        };
    }
    getInApp(user, limit) {
        return this.notificationsService.getInAppForMember(user.id, limit ? parseInt(limit, 10) : 50);
    }
    async getInAppUnreadCount(user) {
        const count = await this.notificationsService.getInAppUnreadCount(user.id);
        return { count };
    }
    markInAppAsRead(id, user) {
        return this.notificationsService.markInAppAsRead(id, user.id);
    }
    markAllInAppAsRead(user) {
        return this.notificationsService.markAllInAppAsRead(user.id);
    }
    confirmPayment(body) {
        return this.notificationsService.sendPaymentConfirmation(body.memberId, body.amount, body.periodLabel || '');
    }
    getStatus() {
        return this.notificationsService.getWhatsAppStatus();
    }
    getLogs(memberId, limit) {
        return this.notificationsService.getLogs(memberId, limit ? parseInt(limit, 10) : 50);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)('remind-cotisation'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "remindCotisation", null);
__decorate([
    (0, common_1.Post)('remind-all-arrears'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "remindAllArrears", null);
__decorate([
    (0, common_1.Get)('in-app'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getInApp", null);
__decorate([
    (0, common_1.Get)('in-app/count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getInAppUnreadCount", null);
__decorate([
    (0, common_1.Patch)('in-app/:id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markInAppAsRead", null);
__decorate([
    (0, common_1.Patch)('in-app/read-all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAllInAppAsRead", null);
__decorate([
    (0, common_1.Post)('confirm-payment'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER, client_1.Role.COMMISSIONER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER, client_1.Role.COMMISSIONER),
    __param(0, (0, common_1.Query)('memberId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getLogs", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, profile_completed_guard_1.ProfileCompletedGuard),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        contributions_service_1.ContributionsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map