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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileCompletedGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const skip_profile_check_decorator_1 = require("./skip-profile-check.decorator");
let ProfileCompletedGuard = class ProfileCompletedGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const skip = this.reflector.getAllAndOverride(skip_profile_check_decorator_1.SKIP_PROFILE_CHECK_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip)
            return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user?.id)
            return true;
        if (user.role === client_1.Role.ADMIN)
            return true;
        const member = await this.prisma.member.findUnique({
            where: { id: user.id },
            select: { profileCompleted: true },
        });
        if (!member?.profileCompleted) {
            throw new common_1.ForbiddenException('Complétez votre profil (nom, prénom, photo, coordonnées) pour accéder à l’application.');
        }
        return true;
    }
};
exports.ProfileCompletedGuard = ProfileCompletedGuard;
exports.ProfileCompletedGuard = ProfileCompletedGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], ProfileCompletedGuard);
//# sourceMappingURL=profile-completed.guard.js.map