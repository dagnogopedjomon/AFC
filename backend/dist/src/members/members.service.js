"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../notifications/notifications.service");
const SALT_ROUNDS = 10;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
let MembersService = class MembersService {
    prisma;
    notifications;
    jwtService;
    constructor(prisma, notifications, jwtService) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.jwtService = jwtService;
    }
    async createInvite(dto, performedById) {
        const existing = await this.prisma.member.findUnique({
            where: { phone: dto.phone.trim() },
        });
        if (existing) {
            throw new common_1.ConflictException('Ce numéro de téléphone est déjà utilisé');
        }
        const member = await this.prisma.member.create({
            data: {
                phone: dto.phone.trim(),
                passwordHash: null,
                firstName: 'Invité',
                lastName: '—',
                role: client_1.Role.PLAYER,
                profileCompleted: false,
            },
            select: this.selectPublic(),
        });
        const activationToken = this.jwtService.sign({ sub: member.id, purpose: 'activation' }, { expiresIn: '24h' });
        const activationLink = `${FRONTEND_URL}/activate?token=${encodeURIComponent(activationToken)}`;
        const inviteResult = await this.notifications.sendActivationInvite(member.id, member.phone, activationLink);
        await this.logAudit(member.id, 'INVITED', performedById, undefined);
        return {
            ...member,
            activationLink,
            whatsappSent: inviteResult.whatsappSent,
            whatsappError: inviteResult.whatsappError,
        };
    }
    async create(dto) {
        const existing = await this.prisma.member.findUnique({
            where: { phone: dto.phone.trim() },
        });
        if (existing) {
            throw new common_1.ConflictException('Ce numéro de téléphone est déjà utilisé');
        }
        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const member = await this.prisma.member.create({
            data: {
                phone: dto.phone.trim(),
                passwordHash,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                role: dto.role,
                profilePhotoUrl: dto.profilePhotoUrl ?? null,
                email: dto.email?.trim() ?? null,
                neighborhood: dto.neighborhood?.trim() ?? null,
                secondaryContact: dto.secondaryContact?.trim() ?? null,
                profileCompleted: false,
            },
            select: this.selectPublic(),
        });
        return member;
    }
    async findAll() {
        return this.prisma.member.findMany({
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            select: this.selectPublic(),
        });
    }
    async findOne(id) {
        const member = await this.prisma.member.findUnique({
            where: { id },
            select: this.selectPublic(),
        });
        if (!member)
            throw new common_1.NotFoundException('Membre introuvable');
        return member;
    }
    async update(id, dto, currentUserId, currentUserRole) {
        const existing = await this.findOne(id);
        const isSelf = id === currentUserId;
        const data = {};
        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        }
        if (dto.firstName !== undefined)
            data.firstName = dto.firstName.trim();
        if (dto.lastName !== undefined)
            data.lastName = dto.lastName.trim();
        if (dto.profilePhotoUrl !== undefined)
            data.profilePhotoUrl = dto.profilePhotoUrl;
        if (dto.email !== undefined)
            data.email = dto.email?.trim() ?? null;
        if (dto.neighborhood !== undefined)
            data.neighborhood = dto.neighborhood?.trim() ?? null;
        if (dto.secondaryContact !== undefined)
            data.secondaryContact = dto.secondaryContact?.trim() ?? null;
        if (dto.profileCompleted !== undefined && !isSelf) {
            data.profileCompleted = dto.profileCompleted;
        }
        if (dto.isSuspended !== undefined && currentUserRole === client_1.Role.ADMIN && !isSelf) {
            data.isSuspended = dto.isSuspended;
            if (dto.isSuspended === false && existing.isSuspended) {
                data.reactivatedAt = new Date();
            }
            if (dto.isSuspended === true) {
                data.reactivatedAt = null;
            }
        }
        if (dto.role !== undefined && currentUserRole === client_1.Role.ADMIN && !isSelf) {
            data.role = dto.role;
        }
        const updated = await this.prisma.member.update({
            where: { id },
            data,
            select: this.selectPublic(),
        });
        if (dto.isSuspended === false && existing.isSuspended) {
            await this.logAudit(id, 'REACTIVATED', currentUserId, undefined);
        }
        else {
            await this.logAudit(id, 'UPDATED', currentUserId, undefined);
        }
        return updated;
    }
    async completeProfile(userId, dto) {
        const member = await this.prisma.member.update({
            where: { id: userId },
            data: {
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                profilePhotoUrl: dto.profilePhotoUrl,
                email: dto.email?.trim() ?? null,
                neighborhood: dto.neighborhood?.trim() ?? null,
                secondaryContact: dto.secondaryContact?.trim() ?? null,
                profileCompleted: true,
            },
            select: this.selectPublic(),
        });
        await this.logAudit(userId, 'PROFILE_COMPLETED', userId, undefined);
        return member;
    }
    async logAudit(memberId, action, performedById, details) {
        await this.prisma.memberAuditLog.create({
            data: { memberId, action, performedById, details: details ?? null },
        });
    }
    async getAuditLog(memberId) {
        await this.findOne(memberId);
        return this.prisma.memberAuditLog.findMany({
            where: { memberId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                performedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.member.delete({ where: { id } });
        return { success: true };
    }
    selectPublic() {
        return {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            profilePhotoUrl: true,
            email: true,
            neighborhood: true,
            secondaryContact: true,
            profileCompleted: true,
            isSuspended: true,
            reactivatedAt: true,
            createdAt: true,
            updatedAt: true,
        };
    }
};
exports.MembersService = MembersService;
exports.MembersService = MembersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        jwt_1.JwtService])
], MembersService);
//# sourceMappingURL=members.service.js.map