import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { PublishActivityDto } from './dto/publish-activity.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '@prisma/client';
import type { RequestUser } from '../auth/jwt.strategy';
import { SupabaseService } from '../supabase/supabase.service';

/** Images acceptées pour les albums : 5 Mo au plus (cahier des charges, section 9). */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Vérification du type sur le contenu du fichier, pas seulement sur l'extension. */
function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

const BUREAU_OR_ADMIN: Role[] = [
  Role.ADMIN,
  Role.PRESIDENT,
  Role.SECRETARY_GENERAL,
  Role.TREASURER,
  Role.COMMISSIONER,
  Role.GENERAL_MEANS_MANAGER,
];

@Controller('activities')
@UseGuards(JwtAuthGuard, ProfileCompletedGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly supabase: SupabaseService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  createActivity(@Body() dto: CreateActivityDto) {
    return this.activitiesService.createActivity(dto);
  }

  @Get()
  findAllActivities() {
    return this.activitiesService.findAllActivities();
  }

  @Get('recent-count')
  getRecentCount(@CurrentUser() user: RequestUser) {
    return this.activitiesService.getRecentCount(user.id).then((count) => ({ count }));
  }

  @Post('seen')
  markActivitiesSeen(@CurrentUser() user: RequestUser) {
    return this.activitiesService.markActivitiesSeen(user.id);
  }

  @Get('announcements')
  findAllAnnouncements() {
    return this.activitiesService.findAllAnnouncements();
  }

  @Post('announcements')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  createAnnouncement(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: RequestUser) {
    return this.activitiesService.createAnnouncement(dto, user.id);
  }

  @Get(':id')
  findOneActivity(@Param('id') id: string) {
    return this.activitiesService.findOneActivity(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  updateActivity(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.updateActivity(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  deleteActivity(@Param('id') id: string) {
    return this.activitiesService.deleteActivity(id);
  }

  @Post('photos')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  createPhoto(@Body() dto: CreatePhotoDto, @CurrentUser() user: RequestUser) {
    return this.activitiesService.createPhoto(dto, user.id);
  }

  @Post('photos/upload')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage ? multer.memoryStorage() : undefined,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          cb(new Error('Formats acceptés : JPEG, PNG ou WebP.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('activityId') activityId: string,
    @Body('caption') caption: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier envoyé');
    if (!activityId) throw new BadRequestException('activityId requis');
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image trop lourde : 5 Mo au maximum.');
    }
    const sniffed = sniffImageType(file.buffer);
    if (!sniffed || !ALLOWED_IMAGE_TYPES.includes(sniffed)) {
      throw new BadRequestException('Formats acceptés : JPEG, PNG ou WebP.');
    }

    let url: string;
    if (this.supabase.isConfigured()) {
      const publicUrl = await this.supabase.uploadActivityPhoto(
        file.buffer,
        file.mimetype,
        activityId,
      );
      url = publicUrl;
    } else {
      const photosDir = join(process.cwd(), 'uploads', 'photos');
      if (!existsSync(photosDir)) mkdirSync(photosDir, { recursive: true });
      const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`;
      const filepath = join(photosDir, filename);
      writeFileSync(filepath, file.buffer);
      url = `/uploads/photos/${filename}`;
    }

    return this.activitiesService.createPhoto(
      { url, caption: caption?.trim(), activityId },
      user.id,
    );
  }

  /** Publier, retirer ou archiver un événement sur le site public. */
  @Patch(':id/publication')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  setPublication(
    @Param('id') id: string,
    @Body() dto: PublishActivityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.activitiesService.setPublication(id, dto, user.id);
  }

  /** Visibilité de l'album sur le site et photo de couverture. */
  @Patch(':id/album')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  updateAlbum(@Param('id') id: string, @Body() dto: UpdateAlbumDto) {
    return this.activitiesService.updateAlbum(id, dto);
  }

  /** Nouvel ordre des photos de l'album. */
  @Patch(':id/album/order')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  reorderPhotos(@Param('id') id: string, @Body('photoIds') photoIds: string[]) {
    if (!Array.isArray(photoIds)) throw new BadRequestException('photoIds requis');
    return this.activitiesService.reorderPhotos(id, photoIds);
  }

  /** Légende, visibilité ou position d'une photo. */
  @Patch('photos/:id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  updatePhoto(@Param('id') id: string, @Body() dto: UpdatePhotoDto) {
    return this.activitiesService.updatePhoto(id, dto);
  }

  @Delete('photos/:id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  deletePhoto(@Param('id') id: string) {
    return this.activitiesService.deletePhoto(id);
  }

  @Get(':id/photos')
  getPhotosByActivity(@Param('id') id: string) {
    return this.activitiesService.getPhotosByActivity(id);
  }
}
