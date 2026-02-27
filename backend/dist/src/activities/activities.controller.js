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
exports.ActivitiesController = void 0;
const common_1 = require("@nestjs/common");
const activities_service_1 = require("./activities.service");
const create_activity_dto_1 = require("./dto/create-activity.dto");
const create_announcement_dto_1 = require("./dto/create-announcement.dto");
const create_photo_dto_1 = require("./dto/create-photo.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const client_1 = require("@prisma/client");
const BUREAU_OR_ADMIN = [
    client_1.Role.ADMIN,
    client_1.Role.PRESIDENT,
    client_1.Role.SECRETARY_GENERAL,
    client_1.Role.TREASURER,
    client_1.Role.COMMISSIONER,
    client_1.Role.GENERAL_MEANS_MANAGER,
];
let ActivitiesController = class ActivitiesController {
    activitiesService;
    constructor(activitiesService) {
        this.activitiesService = activitiesService;
    }
    createActivity(dto) {
        return this.activitiesService.createActivity(dto);
    }
    findAllActivities() {
        return this.activitiesService.findAllActivities();
    }
    getRecentCount(user) {
        return this.activitiesService.getRecentCount(user.id).then((count) => ({ count }));
    }
    markActivitiesSeen(user) {
        return this.activitiesService.markActivitiesSeen(user.id);
    }
    findAllAnnouncements() {
        return this.activitiesService.findAllAnnouncements();
    }
    createAnnouncement(dto, user) {
        return this.activitiesService.createAnnouncement(dto, user.id);
    }
    findOneActivity(id) {
        return this.activitiesService.findOneActivity(id);
    }
    createPhoto(dto, user) {
        return this.activitiesService.createPhoto(dto, user.id);
    }
    getPhotosByActivity(id) {
        return this.activitiesService.getPhotosByActivity(id);
    }
};
exports.ActivitiesController = ActivitiesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_activity_dto_1.CreateActivityDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "createActivity", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "findAllActivities", null);
__decorate([
    (0, common_1.Get)('recent-count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "getRecentCount", null);
__decorate([
    (0, common_1.Post)('seen'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "markActivitiesSeen", null);
__decorate([
    (0, common_1.Get)('announcements'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "findAllAnnouncements", null);
__decorate([
    (0, common_1.Post)('announcements'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_announcement_dto_1.CreateAnnouncementDto, Object]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "createAnnouncement", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "findOneActivity", null);
__decorate([
    (0, common_1.Post)('photos'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_photo_dto_1.CreatePhotoDto, Object]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "createPhoto", null);
__decorate([
    (0, common_1.Get)(':id/photos'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "getPhotosByActivity", null);
exports.ActivitiesController = ActivitiesController = __decorate([
    (0, common_1.Controller)('activities'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, profile_completed_guard_1.ProfileCompletedGuard),
    __metadata("design:paramtypes", [activities_service_1.ActivitiesService])
], ActivitiesController);
//# sourceMappingURL=activities.controller.js.map