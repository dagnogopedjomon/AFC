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
const cinetpay_service_1 = require("./cinetpay.service");
const create_contribution_dto_1 = require("./dto/create-contribution.dto");
const update_contribution_dto_1 = require("./dto/update-contribution.dto");
const record_payment_dto_1 = require("./dto/record-payment.dto");
const self_payment_dto_1 = require("./dto/self-payment.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let ContributionsController = class ContributionsController {
    contributionsService;
    cinetpayService;
    constructor(contributionsService, cinetpayService) {
        this.contributionsService = contributionsService;
        this.cinetpayService = cinetpayService;
    }
    create(dto) {
        return this.contributionsService.create(dto);
    }
    update(id, dto) {
        return this.contributionsService.update(id, dto);
    }
    findAll() {
        return this.contributionsService.findAll();
    }
    getMonthly() {
        return this.contributionsService.findMonthlyContribution();
    }
    getArrears(year, month) {
        const now = new Date();
        const periodYear = year ? parseInt(year, 10) : now.getFullYear();
        const periodMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
        return this.contributionsService.getMembersInArrears(periodYear, periodMonth);
    }
    applySuspensions() {
        return this.contributionsService.applySuspensions();
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
    async cinetpayInit(req, dto) {
        return this.cinetpayService.initPayment(req.user.id, {
            contributionId: dto.contributionId,
            amount: dto.amount,
            periodYear: dto.periodYear,
            periodMonth: dto.periodMonth,
        });
    }
    async cinetpayVerify(req, transactionId) {
        return this.cinetpayService.verifyAndComplete(transactionId, req.user.id);
    }
    recordPayment(dto) {
        return this.contributionsService.recordPayment(dto);
    }
    getPayments(memberId, contributionId, year, month, limit) {
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
    getMemberHistory(memberId) {
        return this.contributionsService.getMemberHistory(memberId);
    }
    getMyStatus(req) {
        return this.contributionsService.getMemberHistory(req.user.id);
    }
    getMyUnpaidMonths(req) {
        return this.contributionsService.getMyUnpaidMonths(req.user.id);
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('monthly'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "getMonthly", null);
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
    (0, common_1.Post)('apply-suspensions'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContributionsController.prototype, "applySuspensions", null);
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
    (0, common_1.Post)('payments/cinetpay/init'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, self_payment_dto_1.SelfPaymentDto]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "cinetpayInit", null);
__decorate([
    (0, common_1.Get)('payments/cinetpay/verify/:transactionId'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ContributionsController.prototype, "cinetpayVerify", null);
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
    (0, common_1.Get)('payments'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard),
    __param(0, (0, common_1.Query)('memberId')),
    __param(1, (0, common_1.Query)('contributionId')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
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
        cinetpay_service_1.CinetpayService])
], ContributionsController);
//# sourceMappingURL=contributions.controller.js.map