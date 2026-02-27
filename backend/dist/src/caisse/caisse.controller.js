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
exports.CaisseController = void 0;
const common_1 = require("@nestjs/common");
const caisse_service_1 = require("./caisse.service");
const create_expense_dto_1 = require("./dto/create-expense.dto");
const create_cash_box_dto_1 = require("./dto/create-cash-box.dto");
const update_cash_box_dto_1 = require("./dto/update-cash-box.dto");
const reject_expense_dto_1 = require("./dto/reject-expense.dto");
const create_transfer_dto_1 = require("./dto/create-transfer.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const client_1 = require("@prisma/client");
let CaisseController = class CaisseController {
    caisseService;
    constructor(caisseService) {
        this.caisseService = caisseService;
    }
    getSummary() {
        return this.caisseService.getSummary();
    }
    getLivre(limit) {
        return this.caisseService.getLivreDeCaisse(limit ? parseInt(limit, 10) : 100);
    }
    getCashBoxes() {
        return this.caisseService.getCashBoxes();
    }
    createCashBox(dto) {
        return this.caisseService.createCashBox(dto);
    }
    updateCashBox(id, dto) {
        return this.caisseService.updateCashBox(id, dto);
    }
    async deleteCashBox(id) {
        await this.caisseService.deleteCashBox(id);
        return { success: true };
    }
    getPendingCount() {
        return this.caisseService.getPendingCount();
    }
    findAllExpenses(cashBoxId, limit) {
        const limitNum = limit ? parseInt(limit, 10) : 100;
        return this.caisseService.findAllExpenses(cashBoxId || undefined, Math.min(Math.max(1, limitNum), 500));
    }
    findOneExpense(id) {
        return this.caisseService.findOneExpense(id);
    }
    createExpense(dto, user) {
        return this.caisseService.createExpense(dto, user.id);
    }
    validateByTreasurer(id, user) {
        return this.caisseService.validateByTreasurer(id, user.id);
    }
    validateByCommissioner(id, user) {
        return this.caisseService.validateByCommissioner(id, user.id);
    }
    rejectExpense(id, dto, user) {
        return this.caisseService.rejectExpense(id, user.id, user.role, dto.motif);
    }
    findAllTransfers(cashBoxId, limit) {
        const limitNum = limit ? parseInt(limit, 10) : 100;
        return this.caisseService.findAllTransfers(cashBoxId || undefined, Math.min(Math.max(1, limitNum), 500));
    }
    findOneTransfer(id) {
        return this.caisseService.findOneTransfer(id);
    }
    createTransfer(dto, user) {
        return this.caisseService.createTransfer(dto, user.id);
    }
    validateTransferByTreasurer(id, user) {
        return this.caisseService.validateTransferByTreasurer(id, user.id);
    }
    validateTransferByCommissioner(id, user) {
        return this.caisseService.validateTransferByCommissioner(id, user.id);
    }
    rejectTransfer(id, dto, user) {
        return this.caisseService.rejectTransfer(id, user.id, user.role, dto.motif);
    }
};
exports.CaisseController = CaisseController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('livre'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "getLivre", null);
__decorate([
    (0, common_1.Get)('boxes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "getCashBoxes", null);
__decorate([
    (0, common_1.Post)('boxes'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cash_box_dto_1.CreateCashBoxDto]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "createCashBox", null);
__decorate([
    (0, common_1.Patch)('boxes/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_cash_box_dto_1.UpdateCashBoxDto]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "updateCashBox", null);
__decorate([
    (0, common_1.Delete)('boxes/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CaisseController.prototype, "deleteCashBox", null);
__decorate([
    (0, common_1.Get)('pending-count'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "getPendingCount", null);
__decorate([
    (0, common_1.Get)('expenses'),
    __param(0, (0, common_1.Query)('cashBoxId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "findAllExpenses", null);
__decorate([
    (0, common_1.Get)('expenses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "findOneExpense", null);
__decorate([
    (0, common_1.Post)('expenses'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_expense_dto_1.CreateExpenseDto, Object]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "createExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/validate-treasurer'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "validateByTreasurer", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/validate-commissioner'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.COMMISSIONER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "validateByCommissioner", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/reject'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER, client_1.Role.COMMISSIONER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_expense_dto_1.RejectExpenseDto, Object]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "rejectExpense", null);
__decorate([
    (0, common_1.Get)('transfers'),
    __param(0, (0, common_1.Query)('cashBoxId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "findAllTransfers", null);
__decorate([
    (0, common_1.Get)('transfers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "findOneTransfer", null);
__decorate([
    (0, common_1.Post)('transfers'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_transfer_dto_1.CreateTransferDto, Object]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "createTransfer", null);
__decorate([
    (0, common_1.Patch)('transfers/:id/validate-treasurer'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "validateTransferByTreasurer", null);
__decorate([
    (0, common_1.Patch)('transfers/:id/validate-commissioner'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.COMMISSIONER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "validateTransferByCommissioner", null);
__decorate([
    (0, common_1.Patch)('transfers/:id/reject'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER, client_1.Role.COMMISSIONER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_expense_dto_1.RejectExpenseDto, Object]),
    __metadata("design:returntype", void 0)
], CaisseController.prototype, "rejectTransfer", null);
exports.CaisseController = CaisseController = __decorate([
    (0, common_1.Controller)('caisse'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, profile_completed_guard_1.ProfileCompletedGuard),
    __metadata("design:paramtypes", [caisse_service_1.CaisseService])
], CaisseController);
//# sourceMappingURL=caisse.controller.js.map