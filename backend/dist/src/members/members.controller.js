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
exports.MembersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = require("fs");
const members_service_1 = require("./members.service");
const create_member_dto_1 = require("./dto/create-member.dto");
const invite_member_dto_1 = require("./dto/invite-member.dto");
const update_member_dto_1 = require("./dto/update-member.dto");
const complete_profile_dto_1 = require("./dto/complete-profile.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const skip_profile_check_decorator_1 = require("../auth/skip-profile-check.decorator");
const client_1 = require("@prisma/client");
const avatarsDir = (0, path_1.join)(process.cwd(), 'uploads', 'avatars');
const avatarStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        if (!(0, fs_1.existsSync)(avatarsDir))
            (0, fs_1.mkdirSync)(avatarsDir, { recursive: true });
        cb(null, avatarsDir);
    },
    filename: (_req, file, cb) => {
        const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`);
    },
});
const BUREAU_ROLES = [
    client_1.Role.PRESIDENT,
    client_1.Role.SECRETARY_GENERAL,
    client_1.Role.TREASURER,
    client_1.Role.COMMISSIONER,
    client_1.Role.GENERAL_MEANS_MANAGER,
];
let MembersController = class MembersController {
    membersService;
    constructor(membersService) {
        this.membersService = membersService;
    }
    invite(dto, user) {
        return this.membersService.createInvite(dto, user.id);
    }
    create(dto) {
        return this.membersService.create(dto);
    }
    findAll() {
        return this.membersService.findAll();
    }
    getMe(user) {
        return this.membersService.findOne(user.id);
    }
    completeProfile(user, dto) {
        return this.membersService.completeProfile(user.id, dto);
    }
    uploadAvatar(user, file) {
        if (!file)
            throw new common_1.BadRequestException('Aucun fichier envoyé');
        return { url: `/uploads/avatars/${file.filename}` };
    }
    getAuditLog(id) {
        return this.membersService.getAuditLog(id);
    }
    findOne(id) {
        return this.membersService.findOne(id);
    }
    update(id, dto, user) {
        return this.membersService.update(id, dto, user.id, user.role);
    }
    remove(id) {
        return this.membersService.remove(id);
    }
};
exports.MembersController = MembersController;
__decorate([
    (0, common_1.Post)('invite'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invite_member_dto_1.InviteMemberDto, Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "invite", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_member_dto_1.CreateMemberDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, ...BUREAU_ROLES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me/complete-profile'),
    (0, skip_profile_check_decorator_1.SkipProfileCheck)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, complete_profile_dto_1.CompleteProfileDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "completeProfile", null);
__decorate([
    (0, common_1.Post)('me/avatar'),
    (0, skip_profile_check_decorator_1.SkipProfileCheck)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: avatarStorage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                cb(new Error('Seules les images sont acceptées'), false);
                return;
            }
            cb(null, true);
        },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Get)(':id/audit-log'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, ...BUREAU_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getAuditLog", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, ...BUREAU_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_member_dto_1.UpdateMemberDto, Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "remove", null);
exports.MembersController = MembersController = __decorate([
    (0, common_1.Controller)('members'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [members_service_1.MembersService])
], MembersController);
//# sourceMappingURL=members.controller.js.map