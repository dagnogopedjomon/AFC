import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '@prisma/client';

export type JwtPayload = { sub: string; phone: string; role: Role };
export type ActivationPayload = { sub: string; purpose: 'activation' };

export interface AuthResult {
  access_token: string;
  user: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    role: Role;
    profileCompleted: boolean;
    profilePhotoUrl: string | null;
    email: string | null;
    isSuspended: boolean;
  };
}

/** Expiration OTP activation (en production, ne pas augmenter). */
const OTP_EXPIRY_MINUTES = 15;
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService,
  ) {}

  async validateUser(phone: string, password: string) {
    const member = await this.prisma.member.findUnique({
      where: { phone: phone.trim() },
    });
    if (!member || !member.passwordHash) return null;
    const ok = await bcrypt.compare(password, member.passwordHash);
    if (!ok) return null;
    return member;
  }

  async login(phone: string, password: string): Promise<AuthResult> {
    const member = await this.validateUser(phone, password);
    if (!member) {
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }
    if (member.isSuspended && member.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Compte suspendu pour non-paiement. Contactez l'administrateur.",
      );
    }
    const payload: JwtPayload = { sub: member.id, phone: member.phone, role: member.role };
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

  async findById(id: string) {
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

  async sendActivationOtp(phone: string) {
    const member = await this.prisma.member.findUnique({
      where: { phone: phone.trim() },
    });
    if (!member) {
      throw new BadRequestException('Ce numéro n’est pas enregistré. Demandez une invitation au club.');
    }
    if (member.passwordHash) {
      throw new BadRequestException('Ce compte est déjà activé. Connectez-vous avec votre mot de passe.');
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

  async verifyActivationOtp(phone: string, code: string) {
    const member = await this.prisma.member.findUnique({
      where: { phone: phone.trim() },
    });
    if (!member || !member.otpCode || !member.otpExpiresAt) {
      throw new BadRequestException('Code invalide ou expiré.');
    }
    if (member.otpCode !== code) {
      throw new BadRequestException('Code invalide.');
    }
    if (member.otpExpiresAt < new Date()) {
      throw new BadRequestException('Code expiré. Demandez un nouveau code.');
    }
    const activationToken = this.createActivationToken(member.id, '10m');
    return { activationToken };
  }

  /**
   * Génère un jeton d'activation permettant de définir le mot de passe.
   * Utilisé à la fois après validation d'un OTP et dans les liens d'invitation "1 clic".
   */
  createActivationToken(memberId: string, expiresIn: string = '24h'): string {
    const payload: ActivationPayload = { sub: memberId, purpose: 'activation' };
    // Cast nécessaire car JwtSignOptions.expiresIn utilise un type "StringValue" plus strict que string.
    return this.jwtService.sign(payload, { expiresIn } as any);
  }

  /** Retourne le téléphone associé au token d'activation (pour les anciens liens sans ?phone=). */
  async getActivationPhone(activationToken: string): Promise<{ phone: string }> {
    let payload: ActivationPayload;
    try {
      payload = this.jwtService.verify<ActivationPayload>(activationToken);
    } catch {
      throw new BadRequestException('Lien expiré. Utilisez à nouveau le lien d\'activation.');
    }
    if (payload.purpose !== 'activation') {
      throw new BadRequestException('Jeton invalide.');
    }
    const member = await this.prisma.member.findUnique({
      where: { id: payload.sub },
      select: { phone: true },
    });
    if (!member) {
      throw new BadRequestException('Membre introuvable.');
    }
    return { phone: member.phone };
  }

  async setPassword(activationToken: string, password: string) {
    let payload: ActivationPayload;
    try {
      payload = this.jwtService.verify<ActivationPayload>(activationToken);
    } catch {
      throw new BadRequestException('Lien expiré. Recommencez l’activation.');
    }
    if (payload.purpose !== 'activation') {
      throw new BadRequestException('Jeton invalide.');
    }
    const member = await this.prisma.member.findUnique({
      where: { id: payload.sub },
    });
    if (!member) {
      throw new BadRequestException('Membre introuvable.');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.member.update({
      where: { id: member.id },
      data: { passwordHash, otpCode: null, otpExpiresAt: null },
    });
    return { ok: true, message: 'Mot de passe créé. Vous pouvez vous connecter.' };
  }
}
