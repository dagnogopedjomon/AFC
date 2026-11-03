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
exports.SiteRebuildController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const site_rebuild_service_1 = require("./site-rebuild.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const BUREAU_OR_ADMIN = [
    client_1.Role.ADMIN,
    client_1.Role.PRESIDENT,
    client_1.Role.SECRETARY_GENERAL,
    client_1.Role.TREASURER,
    client_1.Role.COMMISSIONER,
    client_1.Role.GENERAL_MEANS_MANAGER,
];
let SiteRebuildController = class SiteRebuildController {
    siteRebuild;
    constructor(siteRebuild) {
        this.siteRebuild = siteRebuild;
    }
    etat() {
        return this.siteRebuild.etat();
    }
    reconstruire(user) {
        return this.siteRebuild.requestNow(`demande du bureau (${user.id})`);
    }
};
exports.SiteRebuildController = SiteRebuildController;
__decorate([
    (0, common_1.Get)('reconstruction'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SiteRebuildController.prototype, "etat", null);
__decorate([
    (0, common_1.Post)('reconstruction'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteRebuildController.prototype, "reconstruire", null);
exports.SiteRebuildController = SiteRebuildController = __decorate([
    (0, common_1.Controller)('site'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __metadata("design:paramtypes", [site_rebuild_service_1.SiteRebuildService])
], SiteRebuildController);
//# sourceMappingURL=site-rebuild.controller.js.map