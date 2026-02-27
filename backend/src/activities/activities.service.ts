import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async createActivity(dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description?.trim(),
        date: new Date(dto.date),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        result: dto.result?.trim(),
      },
    });
  }

  /** Nombre d’activités créées depuis la dernière visite du membre sur la page Activités (ou 7 jours si jamais visité). */
  async getRecentCount(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { lastSeenActivitiesAt: true },
    });
    const since = member?.lastSeenActivitiesAt
      ? member.lastSeenActivitiesAt
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          return d;
        })();
    return this.prisma.activity.count({
      where: { createdAt: { gt: since } },
    });
  }

  /** Marquer la page Activités comme vue par le membre (badge disparaît). */
  async markActivitiesSeen(memberId: string) {
    await this.prisma.member.update({
      where: { id: memberId },
      data: { lastSeenActivitiesAt: new Date() },
    });
    return { ok: true };
  }

  async findAllActivities(limit = 50) {
    return this.prisma.activity.findMany({
      orderBy: { date: 'desc' },
      take: limit,
      include: { _count: { select: { photos: true } } },
    });
  }

  async findOneActivity(id: string) {
    const a = await this.prisma.activity.findUnique({
      where: { id },
      include: { photos: true },
    });
    if (!a) throw new NotFoundException('Activité introuvable');
    return a;
  }

  async createAnnouncement(dto: CreateAnnouncementDto, authorId: string) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        authorId,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findAllAnnouncements(limit = 30) {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async createPhoto(dto: CreatePhotoDto, uploadedById: string) {
    return this.prisma.photo.create({
      data: {
        url: dto.url,
        caption: dto.caption?.trim(),
        activityId: dto.activityId || null,
        uploadedById,
      },
      include: { activity: true, uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getPhotosByActivity(activityId: string) {
    return this.prisma.photo.findMany({
      where: { activityId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { firstName: true, lastName: true } } },
    });
  }
}
