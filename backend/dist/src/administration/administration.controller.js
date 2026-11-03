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
exports.AdministrationController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const administration_service_1 = require("./administration.service");
const jeko_service_1 = require("../contributions/jeko.service");
const pay_fine_jeko_init_dto_1 = require("./dto/pay-fine-jeko-init.dto");
const pay_fine_jeko_link_dto_1 = require("./dto/pay-fine-jeko-link.dto");
let AdministrationController = class AdministrationController {
    service;
    jekoService;
    constructor(service, jekoService) {
        this.service = service;
        this.jekoService = jekoService;
    }
    categories(all) { return this.service.listCategories(all === '1'); }
    createCategory(body) { return this.service.createCategory(body.name); }
    updateCategory(id, body) { return this.service.updateCategory(id, body); }
    fines(memberId, status, reason) { return this.service.listFines({ memberId, status, reason }); }
    myFines(user) { return this.service.listFines({ memberId: user.id }); }
    createFine(body, user) { return this.service.createFine(body, user.id); }
    settleFine(id) { return this.service.settleFine(id); }
    cancelFine(id) { return this.service.cancelFine(id); }
    async payFineJekoInit(id, dto, user) {
        if (!this.jekoService.isConfigured())
            throw new common_1.BadRequestException('Paiement en ligne non disponible pour le moment.');
        const fine = await this.service.getFineForPayment(id, user);
        return this.jekoService.createFinePaymentRequest({
            amountFcfa: Number(fine.amount),
            memberId: fine.memberId,
            fineId: fine.id,
            paymentMethod: dto.paymentMethod,
            payerPhone: dto.payerPhone,
        });
    }
    async payFineJekoLink(id, dto, user) {
        if (!this.jekoService.isConfigured())
            throw new common_1.BadRequestException('Paiement en ligne non disponible pour le moment.');
        const fine = await this.service.getFineForPayment(id, user);
        return this.jekoService.createFinePaymentLink({
            amountFcfa: Number(fine.amount),
            memberId: fine.memberId,
            fineId: fine.id,
            title: dto.title?.trim() || `Amende AFC — ${fine.reason}`,
        });
    }
    verifyFinePayment(reference) {
        return this.jekoService.verifyAndRecord(reference);
    }
    exemptions(memberId, year) { return this.service.listExemptions(memberId, year ? Number(year) : undefined); }
    createExemption(body, user) { return this.service.createExemption(body, user.id); }
    deleteExemption(id) { return this.service.deleteExemption(id); }
};
exports.AdministrationController = AdministrationController;
__decorate([
    (0, common_1.Get)('expense-categories'),
    __param(0, (0, common_1.Query)('all')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "categories", null);
__decorate([
    (0, common_1.Post)('expense-categories'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('expense-categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Get)('fines'),
    __param(0, (0, common_1.Query)('memberId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "fines", null);
__decorate([
    (0, common_1.Get)('fines/me'),
    (0, roles_decorator_1.Roles)(...Object.values(client_1.Role)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "myFines", null);
__decorate([
    (0, common_1.Post)('fines'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "createFine", null);
__decorate([
    (0, common_1.Patch)('fines/:id/settle'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "settleFine", null);
__decorate([
    (0, common_1.Patch)('fines/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "cancelFine", null);
__decorate([
    (0, common_1.Post)('fines/:id/jeko/init'),
    (0, roles_decorator_1.Roles)(...Object.values(client_1.Role)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pay_fine_jeko_init_dto_1.PayFineJekoInitDto, Object]),
    __metadata("design:returntype", Promise)
], AdministrationController.prototype, "payFineJekoInit", null);
__decorate([
    (0, common_1.Post)('fines/:id/jeko/link'),
    (0, roles_decorator_1.Roles)(...Object.values(client_1.Role)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pay_fine_jeko_link_dto_1.PayFineJekoLinkDto, Object]),
    __metadata("design:returntype", Promise)
], AdministrationController.prototype, "payFineJekoLink", null);
__decorate([
    (0, common_1.Get)('fines/jeko/verify/:reference'),
    (0, roles_decorator_1.Roles)(...Object.values(client_1.Role)),
    __param(0, (0, common_1.Param)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "verifyFinePayment", null);
__decorate([
    (0, common_1.Get)('exemptions'),
    __param(0, (0, common_1.Query)('memberId')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "exemptions", null);
__decorate([
    (0, common_1.Post)('exemptions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "createExemption", null);
__decorate([
    (0, common_1.Delete)('exemptions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "deleteExemption", null);
exports.AdministrationController = AdministrationController = __decorate([
    (0, common_1.Controller)('administration'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __metadata("design:paramtypes", [administration_service_1.AdministrationService,
        jeko_service_1.JekoService])
], AdministrationController);
//# sourceMappingURL=administration.controller.js.map