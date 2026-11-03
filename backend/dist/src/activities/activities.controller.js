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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitiesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = require("fs");
const activities_service_1 = require("./activities.service");
const create_activity_dto_1 = require("./dto/create-activity.dto");
const update_activity_dto_1 = require("./dto/update-activity.dto");
const create_announcement_dto_1 = require("./dto/create-announcement.dto");
const create_photo_dto_1 = require("./dto/create-photo.dto");
const publish_activity_dto_1 = require("./dto/publish-activity.dto");
const update_photo_dto_1 = require("./dto/update-photo.dto");
const update_album_dto_1 = require("./dto/update-album.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const client_1 = require("@prisma/client");
const supabase_service_1 = require("../supabase/supabase.service");
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
function sniffImageType(buffer) {
    if (buffer.length < 12)
        return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        return 'image/png';
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP')
        return 'image/webp';
    return null;
}
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
    supabase;
    constructor(activitiesService, supabase) {
        this.activitiesService = activitiesService;
        this.supabase = supabase;
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
    updateActivity(id, dto) {
        return this.activitiesService.updateActivity(id, dto);
    }
    deleteActivity(id) {
        return this.activitiesService.deleteActivity(id);
    }
    createPhoto(dto, user) {
        return this.activitiesService.createPhoto(dto, user.id);
    }
    async uploadPhoto(file, activityId, caption, user) {
        if (!file)
            throw new common_1.BadRequestException('Aucun fichier envoyé');
        if (!activityId)
            throw new common_1.BadRequestException('activityId requis');
        if (file.size > MAX_IMAGE_BYTES) {
            throw new common_1.BadRequestException('Image trop lourde : 5 Mo au maximum.');
        }
        const sniffed = sniffImageType(file.buffer);
        if (!sniffed || !ALLOWED_IMAGE_TYPES.includes(sniffed)) {
            throw new common_1.BadRequestException('Formats acceptés : JPEG, PNG ou WebP.');
        }
        let url;
        if (this.supabase.isConfigured()) {
            const publicUrl = await this.supabase.uploadActivityPhoto(file.buffer, file.mimetype, activityId);
            url = publicUrl;
        }
        else {
            const photosDir = (0, path_1.join)(process.cwd(), 'uploads', 'photos');
            if (!(0, fs_1.existsSync)(photosDir))
                (0, fs_1.mkdirSync)(photosDir, { recursive: true });
            const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`;
            const filepath = (0, path_1.join)(photosDir, filename);
            (0, fs_1.writeFileSync)(filepath, file.buffer);
            url = `/uploads/photos/${filename}`;
        }
        return this.activitiesService.createPhoto({ url, caption: caption?.trim(), activityId }, user.id);
    }
    setPublication(id, dto, user) {
        return this.activitiesService.setPublication(id, dto, user.id);
    }
    updateAlbum(id, dto) {
        return this.activitiesService.updateAlbum(id, dto);
    }
    reorderPhotos(id, photoIds) {
        if (!Array.isArray(photoIds))
            throw new common_1.BadRequestException('photoIds requis');
        return this.activitiesService.reorderPhotos(id, photoIds);
    }
    updatePhoto(id, dto) {
        return this.activitiesService.updatePhoto(id, dto);
    }
    deletePhoto(id) {
        return this.activitiesService.deletePhoto(id);
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
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_activity_dto_1.UpdateActivityDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "updateActivity", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "deleteActivity", null);
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
    (0, common_1.Post)('photos/upload'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: multer_1.default.memoryStorage ? multer_1.default.memoryStorage() : undefined,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                cb(new Error('Formats acceptés : JPEG, PNG ou WebP.'), false);
                return;
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('activityId')),
    __param(2, (0, common_1.Body)('caption')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ActivitiesController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Patch)(':id/publication'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, publish_activity_dto_1.PublishActivityDto, Object]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "setPublication", null);
__decorate([
    (0, common_1.Patch)(':id/album'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_album_dto_1.UpdateAlbumDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "updateAlbum", null);
__decorate([
    (0, common_1.Patch)(':id/album/order'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('photoIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "reorderPhotos", null);
__decorate([
    (0, common_1.Patch)('photos/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_photo_dto_1.UpdatePhotoDto]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "updatePhoto", null);
__decorate([
    (0, common_1.Delete)('photos/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActivitiesController.prototype, "deletePhoto", null);
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
    __metadata("design:paramtypes", [activities_service_1.ActivitiesService,
        supabase_service_1.SupabaseService])
], ActivitiesController);
//# sourceMappingURL=activities.controller.js.map