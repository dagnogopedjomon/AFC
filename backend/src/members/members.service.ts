import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateMemberDto } from './dto/create-member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { NotificationsService } from '../notifications/notifications.service';

const SALT_ROUNDS = 10;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
      private readonly jwtService: JwtService,
  ) {}

  /** Création d'un invité : téléphone + rôle uniquement. Pas de mot de passe ; invitation envoyée (SMS si configuré, sinon WhatsApp) avec lien d'activation "1 clic". */
  async createInvite(dto: InviteMemberDto, performedById: string) {
    const existing = await this.prisma.member.findUnique({
      where: { phone: dto.phone.trim() },
    });
    if (existing) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }
    const member = await this.prisma.member.create({
      data: {
        phone: dto.phone.trim(),
        passwordHash: null,
        firstName: 'Invité',
        lastName: '—',
        role: Role.PLAYER,
        profileCompleted: false,
      },
      select: this.selectPublic(),
    });
    // Lien d'activation "1 clic" : le jeton d'activation est directement inclus dans l'URL.
    // Le membre clique sur le lien, arrive sur /activate avec ?token=..., et peut définir son mot de passe sans OTP.
    const activationToken = this.jwtService.sign(
      { sub: member.id, purpose: 'activation' } as { sub: string; purpose: 'activation' },
      { expiresIn: '24h' } as any,
    );
    const activationLink = `${FRONTEND_URL}/activate?phone=${encodeURIComponent(member.phone)}&token=${encodeURIComponent(activationToken)}`;
    const inviteResult = await this.notifications.sendActivationInvite(
      member.id,
      member.phone,
      activationLink,
    );
    await this.logAudit(member.id, 'INVITED', performedById, undefined);
    return {
      ...member,
      activationLink,
      whatsappSent: inviteResult.whatsappSent,
      whatsappError: inviteResult.whatsappError,
    };
  }

  async create(dto: CreateMemberDto) {
    const existing = await this.prisma.member.findUnique({
      where: { phone: dto.phone.trim() },
    });
    if (existing) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
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

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: this.selectPublic(),
    });
    if (!member) throw new NotFoundException('Membre introuvable');
    return member;
  }

  async update(id: string, dto: UpdateMemberDto, currentUserId: string, currentUserRole: Role) {
    const existing = await this.findOne(id);
    const isSelf = id === currentUserId;
    const data: Record<string, unknown> = {};

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.profilePhotoUrl !== undefined) data.profilePhotoUrl = dto.profilePhotoUrl;
    if (dto.email !== undefined) data.email = dto.email?.trim() ?? null;
    if (dto.neighborhood !== undefined) data.neighborhood = dto.neighborhood?.trim() ?? null;
    if (dto.secondaryContact !== undefined) data.secondaryContact = dto.secondaryContact?.trim() ?? null;
    if (dto.profileCompleted !== undefined && !isSelf) {
      data.profileCompleted = dto.profileCompleted;
    }
    if (dto.isSuspended !== undefined && currentUserRole === Role.ADMIN && !isSelf) {
      data.isSuspended = dto.isSuspended;
      // Réactivation manuelle par admin : 24h pour payer, sinon re-suspension automatique.
      if (dto.isSuspended === false && existing.isSuspended) {
        (data as any).reactivatedAt = new Date();
      }
      if (dto.isSuspended === true) {
        (data as any).reactivatedAt = null;
      }
    }
    if (dto.role !== undefined && currentUserRole === Role.ADMIN && !isSelf) {
      data.role = dto.role;
    }

    const updated = await this.prisma.member.update({
      where: { id },
      data,
      select: this.selectPublic(),
    });
    if (dto.isSuspended === false && existing.isSuspended) {
      await this.logAudit(id, 'REACTIVATED', currentUserId, undefined);
    } else {
      await this.logAudit(id, 'UPDATED', currentUserId, undefined);
    }
    return updated;
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
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

  /** Enregistrer une action sur un membre (utilisé aussi par contributions pour REACTIVATED). */
  async logAudit(memberId: string, action: string, performedById: string | null, details?: string) {
    await this.prisma.memberAuditLog.create({
      data: { memberId, action, performedById, details: details ?? null },
    });
  }

  async getAuditLog(memberId: string) {
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

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.member.delete({ where: { id } });
    return { success: true };
  }

  private selectPublic() {
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
}
