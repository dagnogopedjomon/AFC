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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
const OTP_EXPIRY_MINUTES = 15;
const SALT_ROUNDS = 10;
let AuthService = class AuthService {
    prisma;
    jwtService;
    notifications;
    constructor(prisma, jwtService, notifications) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.notifications = notifications;
    }
    async validateUser(phone, password) {
        const member = await this.prisma.member.findUnique({
            where: { phone: phone.trim() },
        });
        if (!member || !member.passwordHash)
            return null;
        const ok = await bcrypt.compare(password, member.passwordHash);
        if (!ok)
            return null;
        return member;
    }
    async login(phone, password) {
        const member = await this.validateUser(phone, password);
        if (!member) {
            throw new common_1.UnauthorizedException('Téléphone ou mot de passe incorrect');
        }
        if (member.isSuspended && member.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException("Compte suspendu pour non-paiement. Contactez l'administrateur.");
        }
        const payload = { sub: member.id, phone: member.phone, role: member.role };
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
        const member = await this.prisma.member.findUnique({
            where: { phone: phone.trim() },
        });
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
        const member = await this.prisma.member.findUnique({
            where: { phone: phone.trim() },
        });
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map