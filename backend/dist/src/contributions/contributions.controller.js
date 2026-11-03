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
exports.ContributionsController = void 0;
const common_1 = require("@nestjs/common");
const contributions_service_1 = require("./contributions.service");
const create_contribution_dto_1 = require("./dto/create-contribution.dto");
const update_contribution_dto_1 = require("./dto/update-contribution.dto");
const record_payment_dto_1 = require("./dto/record-payment.dto");
const self_payment_dto_1 = require("./dto/self-payment.dto");
const jeko_init_dto_1 = require("./dto/jeko-init.dto");
const jeko_link_dto_1 = require("./dto/jeko-link.dto");
const allocate_contribution_dto_1 = require("./dto/allocate-contribution.dto");
const record_advance_payment_dto_1 = require("./dto/record-advance-payment.dto");
const cancel_payment_dto_1 = require("./dto/cancel-payment.dto");
const jeko_service_1 = require("./jeko.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const BUREAU_ROLES = [
    client_1.Role.ADMIN,
    client_1.Role.PRESIDENT,
    client_1.Role.SECRETARY_GENERAL,
    client_1.Role.TREASURER,
    client_1.Role.COMMISSIONER,
    client_1.Role.GENERAL_MEANS_MANAGER,
];
let ContributionsController = class ContributionsController {
    contributionsService;
    jekoService;
    constructor(contributionsService, jekoService) {
        this.contributionsService = contributionsService;
        this.jekoService = jekoService;
    }
    create(dto) {
        return this.contributionsService.create(dto);
    }
    update(id, dto) {
        return this.contributionsService.update(id, dto);
    }
    findAll(req) {
        return this.contributionsService.findAll(req.user.id);
    }
    findExceptional(req) {
        return this.contributionsService.findAll(req.user.id).then((list) => list.filter((c) => c.type === 'EXCEPTIONAL'));
    }
    getMonthly() {
        return this.contributionsService.findMonthlyContribution();
    }
    getContributors(id) {
        return this.contributionsService.getContributors(id);
    }
    allocate(req, id, dto) {
        return this.contributionsService.allocateFunds({
            contributionId: id,
            amount: dto.amount,
            fromCashBoxId: dto.fromCashBoxId,
            description: dto.description,
            performedById: req.user.id,
        });
    }
    close(req, id, body) {
        return this.contributionsService.closeContribution(id, body.status, req.user.id);
    }
    getArrears(year, month) {
        const now = new Date();
        const periodYear = year ? parseInt(year, 10) : now.getFullYear();
        const periodMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
        return this.contributionsService.getMembersInArrears(periodYear, periodMonth);
    }
    getAnnualMatrix(year) {
        return this.contributionsService.getAnnualMatrix(year ? parseInt(year, 10) : new Date().getFullYear());
    }
    applySuspensions() {
        return this.contributionsService.applySuspensions();
    }
    async jekoInit(req, dto) {
        if (!this.jekoService.isConfigured()) {
            throw new common_1.BadRequestException('Paiement en ligne non disponible pour le moment.');
        }
        const contribution = await this.contributionsService.findOne(dto.contributionId);
        if (!contribution)
            throw new common_1.BadRequestException('Cotisation introuvable.');
        return this.jekoService.createPaymentRequest({
            amountFcfa: dto.amount,
            memberId: req.user.id,
            contributionId: dto.contributionId,
            periodYear: dto.periodYear,
            periodMonth: dto.periodMonth,
            paymentMethod: dto.paymentMethod,
            payerPhone: dto.payerPhone,
            regularizationAgreementId: dto.regularizationAgreementId,
            advanceMonths: dto.advanceMonths,
        });
    }
    async jekoLink(req, dto) {
        if (!this.jekoService.isConfigured()) {
            throw new common_1.BadRequestException('Paiement en ligne non disponible pour le moment.');
        }
        const contribution = await this.contributionsService.findOne(dto.contributionId);
        if (!contribution)
            throw new common_1.BadRequestException('Cotisation introuvable.');
        return this.jekoService.createPaymentLink({
            amountFcfa: dto.amount,
            memberId: req.user.role === client_1.Role.ADMIN && dto.memberId ? dto.memberId : req.user.id,
            contributionId: dto.contributionId,
            periodYear: dto.periodYear,
            periodMonth: dto.periodMonth,
            title: dto.title,
            regularizationAgreementId: dto.regularizationAgreementId,
            advanceMonths: dto.advanceMonths,
        });
    }
    jekoVerify(reference) {
        return this.jekoService.verifyAndRecord(reference);
    }
    recordPaymentForSelf(req, dto) {
        return this.contributionsService.recordPayment({
            memberId: req.user.id,
            contributionId: dto.contributionId,
            amount: dto.amount,
            periodYear: dto.periodYear,
            periodMonth: dto.periodMonth,
        });
    }
    recordPayment(dto) {
        return this.contributionsService.recordPayment(dto);
    }
    previewAdvance(memberId, months) {
        return this.contributionsService.previewAdvancePeriods(memberId, Math.min(Math.max(parseInt(months, 10) || 1, 1), 12));
    }
    recordExternalAdvance(dto, req) {
        return this.contributionsService.recordExternalAdvancePayment(dto, req.user.id);
    }
    cancelPayment(id, dto, req) {
        return this.contributionsService.cancelPayment(id, dto.reason, req.user.id);
    }
    getMyPrepayment(req) {
        return this.contributionsService.getPrepaymentStatus(req.user.id);
    }
    getPayments(req, memberId, contributionId, year, month, limit) {
        if (memberId && memberId !== req.user.id && !BUREAU_ROLES.includes(req.user.role)) {
            throw new common_1.ForbiddenException("Vous ne pouvez consulter que vos propres paiements.");
        }
        return this.contributionsService.getPayments({
            memberId,
            contributionId,
            periodYear: year ? parseInt(year, 10) : undefined,
            periodMonth: month ? parseInt(month, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    getHistorySummary(year, month) {
        return this.contributionsService.getHistorySummary(year ? parseInt(year, 10) : undefined, month ? parseInt(month, 10) : undefined);
    }
    getMemberHistory(memberId, req) {
        if (memberId !== req.user.id && !BUREAU_ROLES.includes(req.user.role)) {
            throw new common_1.ForbiddenException("Vous ne pouvez consulter que votre propre historique.");
        }
        return this.contributionsService.getMemberHistory(memberId);
    }
    getMyStatus(req) {
        return this.contributionsService.getMemberHistory(req.user.id);
    }
    getMyUnpaidMonths(req) {
        return this.contributionsService.getMyUnpaidMonths(req.user.id);
    }
    getMyDebtSummary(req) {
        return this.contributionsService.getMyDebtSummary(req.user.id);
    }
    findOne(id) {
        return this.contributionsService.findOne(id);
    }
};
exports.ContributionsController = ContributionsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_contribution_dto_1.CreateContributionDto]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_contribution_dto_1.UpdateContributionDto]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('exceptional'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "findExceptional", null);
__decorate([
    (0, common_1.Get)('monthly'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getMonthly", null);
__decorate([
    (0, common_1.Get)(':id/contributors'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getContributors", null);
__decorate([
    (0, common_1.Post)(':id/allocate'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, allocate_contribution_dto_1.AllocateContributionDto]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "allocate", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "close", null);
__decorate([
    (0, common_1.Get)('arrears'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getArrears", null);
__decorate([
    (0, common_1.Get)('annual-matrix'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER, client_1.Role.COMMISSIONER),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getAnnualMatrix", null);
__decorate([
    (0, common_1.Post)('apply-suspensions'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "applySuspensions", null);
__decorate([
    (0, common_1.Post)('payments/jeko/init'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, jeko_init_dto_1.JekoInitDto]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "jekoInit", null);
__decorate([
    (0, common_1.Post)('payments/jeko/link'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, jeko_link_dto_1.JekoLinkDto]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "jekoLink", null);
__decorate([
    (0, common_1.Get)('payments/jeko/verify/:reference'),
    __param(0, (0, common_1.Param)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "jekoVerify", null);
__decorate([
    (0, common_1.Post)('payments/me'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, self_payment_dto_1.SelfPaymentDto]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "recordPaymentForSelf", null);
__decorate([
    (0, common_1.Post)('payments'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [record_payment_dto_1.RecordPaymentDto]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Get)('payments/advance/preview'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Query)('memberId')),
    __param(1, (0, common_1.Query)('months')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "previewAdvance", null);
__decorate([
    (0, common_1.Post)('payments/advance/external'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [record_advance_payment_dto_1.RecordAdvancePaymentDto, Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "recordExternalAdvance", null);
__decorate([
    (0, common_1.Post)('payments/:id/cancel'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cancel_payment_dto_1.CancelPaymentDto, Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "cancelPayment", null);
__decorate([
    (0, common_1.Get)('me/prepayment'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getMyPrepayment", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('memberId')),
    __param(2, (0, common_1.Query)('contributionId')),
    __param(3, (0, common_1.Query)('year')),
    __param(4, (0, common_1.Query)('month')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getPayments", null);
__decorate([
    (0, common_1.Get)('history/summary'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getHistorySummary", null);
__decorate([
    (0, common_1.Get)('history/member/:memberId'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Param)('memberId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getMemberHistory", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getMyStatus", null);
__decorate([
    (0, common_1.Get)('me/unpaid-months'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getMyUnpaidMonths", null);
__decorate([
    (0, common_1.Get)('me/debt'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getMyDebtSummary", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "findOne", null);
exports.ContributionsController = ContributionsController = __decorate([
    (0, common_1.Controller)('contributions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [contributions_service_1.ContributionsService,
        jeko_service_1.JekoService])
], ContributionsController);
//# sourceMappingURL=contributions.controller.js.map