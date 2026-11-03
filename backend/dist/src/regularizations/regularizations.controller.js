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
exports.RegularizationsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const create_regularization_dto_1 = require("./dto/create-regularization.dto");
const update_regularization_dto_1 = require("./dto/update-regularization.dto");
const regularizations_service_1 = require("./regularizations.service");
let RegularizationsController = class RegularizationsController {
    service;
    constructor(service) {
        this.service = service;
    }
    myActive(req) { return this.service.myActive(req.user.id); }
    candidates() { return this.service.listCandidates(); }
    list() { return this.service.list(); }
    forMember(memberId) { return this.service.forMember(memberId); }
    create(dto, req) { return this.service.create(dto, req.user.id); }
    update(id, dto, req) { return this.service.update(id, dto, req.user.id); }
    cancel(id, req) { return this.service.cancel(id, req.user.id); }
};
exports.RegularizationsController = RegularizationsController;
__decorate([
    (0, common_1.Get)('me/active'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RegularizationsController.prototype, "myActive", null);
__decorate([
    (0, common_1.Get)('candidates'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RegularizationsController.prototype, "candidates", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RegularizationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('member/:memberId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('memberId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RegularizationsController.prototype, "forMember", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_regularization_dto_1.CreateRegularizationDto, Object]),
    __metadata("design:returntype", void 0)
], RegularizationsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_regularization_dto_1.UpdateRegularizationDto, Object]),
    __metadata("design:returntype", void 0)
], RegularizationsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RegularizationsController.prototype, "cancel", null);
exports.RegularizationsController = RegularizationsController = __decorate([
    (0, common_1.Controller)('regularizations'),
    __metadata("design:paramtypes", [regularizations_service_1.RegularizationsService])
], RegularizationsController);
//# sourceMappingURL=regularizations.controller.js.map