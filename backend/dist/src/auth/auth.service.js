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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const OTP_EXPIRY_MINUTES = 15;
const SALT_ROUNDS = 10;
function phoneLookupCandidates(input) {
    const trimmed = input.trim();
    const digits = trimmed.replace(/\D/g, '');
    const candidates = new Set();
    if (trimmed)
        candidates.add(trimmed);
    if (digits)
        candidates.add(digits);
    if (digits.length === 10) {
        candidates.add('0' + digits.slice(-9));
        candidates.add('+225' + digits);
        candidates.add('225' + digits);
    }
    else if (digits.startsWith('225') && digits.length >= 11) {
        const local = digits.slice(3);
        candidates.add(local);
        candidates.add('+' + digits);
        candidates.add('+225' + local);
        candidates.add('225' + local);
    }
    return [...candidates];
}
async function findMemberByPhone(prisma, phone) {
    const phoneCandidates = phoneLookupCandidates(phone);
    return prisma.member.findFirst({
        where: { phone: { in: phoneCandidates } },
    });
}
async function findMemberByIdentifier(prisma, identifier) {
    const normalized = identifier.trim();
    if (normalized.includes('@')) {
        return prisma.member.findFirst({
            where: { email: { equals: normalized, mode: 'insensitive' } },
        });
    }
    return findMemberByPhone(prisma, normalized);
}
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    notifications;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, notifications) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.notifications = notifications;
    }
    async validateUser(identifier, password) {
        const member = await findMemberByIdentifier(this.prisma, identifier);
        const candidates = identifier.includes('@') ? identifier.trim() : phoneLookupCandidates(identifier).join(',');
        this.logger.log(`[Auth] login identifier=${identifier.trim()} candidates=[${candidates}] found=${!!member} hasPassword=${!!member?.passwordHash}`);
        if (!member || !member.passwordHash)
            return null;
        try {
            const ok = await bcrypt.compare(password, member.passwordHash);
            if (!ok)
                return null;
        }
        catch {
            return null;
        }
        return member;
    }
    async login(phone, password, deviceId) {
        try {
            const member = await this.validateUser(phone, password);
            if (!member) {
                throw new common_1.UnauthorizedException('Identifiant ou mot de passe incorrect');
            }
            await this.prisma.member.update({ where: { id: member.id }, data: { activeDeviceId: deviceId } });
            const payload = { sub: member.id, phone: member.phone, role: member.role, deviceId };
            const access_token = this.jwtService.sign(payload);
            return {
                access_token,
                user: {
                    id: member.id,
                    phone: member.phone,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    role: member.role,
                    profileCompleted: member.profileCompleted,
                    profilePhotoUrl: member.profilePhotoUrl,
                    email: member.email,
                    isSuspended: member.isSuspended,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            this.logger.error(`[Auth] Login failed for phone=${phone.trim()}`, error instanceof Error ? error.stack : String(error));
            const message = error instanceof Error ? error.message : 'Erreur inconnue';
            throw new common_1.InternalServerErrorException(`Erreur lors de la connexion: ${message}`);
        }
    }
    async logout(userId, deviceId) {
        await this.prisma.member.updateMany({
            where: { id: userId, ...(deviceId ? { activeDeviceId: deviceId } : {}) },
            data: { activeDeviceId: null },
        });
        return { ok: true };
    }
    async assertDevice(userId, deviceId) {
        const member = await this.prisma.member.findUnique({ where: { id: userId }, select: { activeDeviceId: true } });
        if (!member)
            throw new common_1.UnauthorizedException('Membre introuvable');
        if (deviceId && member.activeDeviceId && member.activeDeviceId !== deviceId) {
            throw new common_1.UnauthorizedException('Session ouverte sur un autre appareil');
        }
    }
    async findById(id) {
        return this.prisma.member.findUnique({
            where: { id },
            select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                role: true,
                profileCompleted: true,
                profilePhotoUrl: true,
                email: true,
                neighborhood: true,
                secondaryContact: true,
                isSuspended: true,
                createdAt: true,
            },
        });
    }
    async sendActivationOtp(phone) {
        const member = await findMemberByPhone(this.prisma, phone);
        if (!member) {
            throw new common_1.BadRequestException('Ce numéro n’est pas enregistré. Demandez une invitation au club.');
        }
        if (member.passwordHash) {
            throw new common_1.BadRequestException('Ce compte est déjà activé. Connectez-vous avec votre mot de passe.');
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.member.update({
            where: { id: member.id },
            data: { otpCode: code, otpExpiresAt: expiresAt },
        });
        await this.notifications.sendActivationOtp(member.phone, code);
        const { smsConfigured, whatsappConfigured } = this.notifications.getWhatsAppStatus();
        if (!smsConfigured && !whatsappConfigured) {
            console.log('[Auth] Mode démo : code OTP retourné à l’écran (aucun canal configuré)');
            return { ok: true, demoCode: code, message: 'Mode démo : utilisez le code affiché.' };
        }
        return { ok: true, message: 'Code envoyé (SMS ou WhatsApp).' };
    }
    async verifyActivationOtp(phone, code) {
        const member = await findMemberByPhone(this.prisma, phone);
        if (!member || !member.otpCode || !member.otpExpiresAt) {
            throw new common_1.BadRequestException('Code invalide ou expiré.');
        }
        if (member.otpCode !== code) {
            throw new common_1.BadRequestException('Code invalide.');
        }
        if (member.otpExpiresAt < new Date()) {
            throw new common_1.BadRequestException('Code expiré. Demandez un nouveau code.');
        }
        const activationToken = this.createActivationToken(member.id, '10m');
        return { activationToken };
    }
    createActivationToken(memberId, expiresIn = '24h') {
        const payload = { sub: memberId, purpose: 'activation' };
        return this.jwtService.sign(payload, { expiresIn });
    }
    async getActivationPhone(activationToken) {
        let payload;
        try {
            payload = this.jwtService.verify(activationToken);
        }
        catch {
            throw new common_1.BadRequestException('Lien expiré. Utilisez à nouveau le lien d\'activation.');
        }
        if (payload.purpose !== 'activation') {
            throw new common_1.BadRequestException('Jeton invalide.');
        }
        const member = await this.prisma.member.findUnique({
            where: { id: payload.sub },
            select: { phone: true },
        });
        if (!member) {
            throw new common_1.BadRequestException('Membre introuvable.');
        }
        return { phone: member.phone };
    }
    async setPassword(activationToken, password) {
        let payload;
        try {
            payload = this.jwtService.verify(activationToken);
        }
        catch {
            throw new common_1.BadRequestException('Lien expiré. Recommencez l’activation.');
        }
        if (payload.purpose !== 'activation') {
            throw new common_1.BadRequestException('Jeton invalide.');
        }
        const member = await this.prisma.member.findUnique({
            where: { id: payload.sub },
        });
        if (!member) {
            throw new common_1.BadRequestException('Membre introuvable.');
        }
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        await this.prisma.member.update({
            where: { id: member.id },
            data: { passwordHash, otpCode: null, otpExpiresAt: null },
        });
        return { ok: true, message: 'Mot de passe créé. Vous pouvez vous connecter.' };
    }
    async changePassword(memberId, currentPassword, newPassword) {
        if (currentPassword === newPassword) {
            throw new common_1.BadRequestException('Le nouveau mot de passe doit être différent.');
        }
        const member = await this.prisma.member.findUnique({ where: { id: memberId } });
        if (!member?.passwordHash || !(await bcrypt.compare(currentPassword, member.passwordHash))) {
            throw new common_1.UnauthorizedException('Le mot de passe actuel est incorrect.');
        }
        await this.prisma.member.update({
            where: { id: memberId },
            data: { passwordHash: await bcrypt.hash(newPassword, SALT_ROUNDS) },
        });
        return { ok: true, message: 'Mot de passe mis à jour.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map