import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { MembersService } from './members.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { SkipProfileCheck } from '../auth/skip-profile-check.decorator';
import { Role } from '@prisma/client';
import type { RequestUser } from '../auth/jwt.strategy';

const avatarsDir = join(process.cwd(), 'uploads', 'avatars');
const avatarStorage = multer.memoryStorage();

const BUREAU_ROLES: Role[] = [
  Role.PRESIDENT,
  Role.SECRETARY_GENERAL,
  Role.TREASURER,
  Role.COMMISSIONER,
  Role.GENERAL_MEANS_MANAGER,
];

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly supabase: SupabaseService,
  ) {}

  /** Inviter un membre : téléphone + rôle. Pas de mot de passe ; invitation WhatsApp envoyée. */
  @Post('invite')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN)
  invite(@Body() dto: InviteMemberDto, @CurrentUser() user: RequestUser) {
    return this.membersService.createInvite(dto, user.id);
  }

  /** Seul l’Admin crée les comptes complets (legacy / import). */
  @Post()
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Get()
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, ...BUREAU_ROLES)
  findAll() {
    return this.membersService.findAll();
  }

  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return this.membersService.findOne(user.id);
  }

  @Patch('me/complete-profile')
  @SkipProfileCheck()
  completeProfile(@CurrentUser() user: RequestUser, @Body() dto: CompleteProfileDto) {
    return this.membersService.completeProfile(user.id, dto);
  }

  @Post('me/avatar')
  @SkipProfileCheck()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('Seules les images sont acceptées'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier envoyé');
    const buffer = file.buffer;
    if (!buffer) throw new BadRequestException('Fichier invalide');

    if (this.supabase.isConfigured()) {
      const publicUrl = await this.supabase.uploadAvatar(
        buffer,
        file.mimetype,
        user.id,
      );
      return { url: publicUrl };
    }

    if (!existsSync(avatarsDir)) mkdirSync(avatarsDir, { recursive: true });
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`;
    const filepath = join(avatarsDir, filename);
    writeFileSync(filepath, buffer);
    return { url: `/uploads/avatars/${filename}` };
  }

  @Get(':id/audit-log')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, ...BUREAU_ROLES)
  getAuditLog(@Param('id') id: string) {
    return this.membersService.getAuditLog(id);
  }

  @Get(':id')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, ...BUREAU_ROLES)
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  /** Seul l’Admin modifie les comptes. */
  @Patch(':id')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.membersService.update(id, dto, user.id, user.role);
  }

  /** Seul l’Admin supprime les comptes. */
  @Delete(':id')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}
