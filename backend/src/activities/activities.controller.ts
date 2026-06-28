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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '@prisma/client';
import type { RequestUser } from '../auth/jwt.strategy';
import { SupabaseService } from '../supabase/supabase.service';

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
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('Seules les images sont acceptées'), false);
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
