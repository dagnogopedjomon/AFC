import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '@prisma/client';
import type { RequestUser } from '../auth/jwt.strategy';

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
  constructor(private readonly activitiesService: ActivitiesService) {}

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

  @Post('photos')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  createPhoto(@Body() dto: CreatePhotoDto, @CurrentUser() user: RequestUser) {
    return this.activitiesService.createPhoto(dto, user.id);
  }

  @Get(':id/photos')
  getPhotosByActivity(@Param('id') id: string) {
    return this.activitiesService.getPhotosByActivity(id);
  }
}
