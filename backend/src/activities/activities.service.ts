import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { PublishActivityDto } from './dto/publish-activity.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { PublicationStatus } from '@prisma/client';
import { SiteRebuildService } from '../public/site-rebuild.service';

/** Les adresses d'images renvoyées au site public doivent être absolues. */
function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
}

/** Adresse courte tirée du titre : « Match contre la corporation X » → « match-contre-la-corporation-x ». */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'evenement';
}

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteRebuild: SiteRebuildService,
  ) {}

  async createActivity(dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description?.trim(),
        date: new Date(dto.date),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        result: dto.result?.trim(),
        location: dto.location?.trim() || null,
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

  async updateActivity(id: string, dto: UpdateActivityDto) {
    const a = await this.findOneActivity(id);
    this.requestRebuildIfPublished(a);
    return this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.result !== undefined && { result: dto.result?.trim() || null }),
        ...(dto.location !== undefined && { location: dto.location?.trim() || null }),
      },
      include: { photos: true },
    });
  }

  async deleteActivity(id: string) {
    const a = await this.findOneActivity(id);
    this.requestRebuildIfPublished(a);
    await this.prisma.photo.deleteMany({ where: { activityId: id } });
    await this.prisma.activity.delete({ where: { id } });
    return { success: true };
  }

  async deletePhoto(id: string) {
    const p = await this.prisma.photo.findUnique({
      where: { id },
      include: { activity: { select: { title: true, publicationStatus: true } } },
    });
    if (!p) throw new NotFoundException('Photo introuvable');
    if (p.activity) this.requestRebuildIfPublished(p.activity);
    await this.prisma.photo.delete({ where: { id } });
    return { success: true };
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
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { uploadedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  // ========== Lot 1 : publication des événements sur le site public ==========

  /** Adresse courte unique : on suffixe tant que le slug est déjà pris. */
  private async uniqueSlug(title: string, activityId: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    for (let i = 2; i < 50; i++) {
      const existing = await this.prisma.activity.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === activityId) return candidate;
      candidate = `${base}-${i}`;
    }
    return `${base}-${activityId.slice(-6)}`;
  }

  /**
   * Publier, retirer ou archiver un événement. Publier lui donne son adresse
   * courte et sa date de parution ; chaque action est écrite au journal.
   */
  async setPublication(id: string, dto: PublishActivityDto, performedById: string) {
    const activity = await this.findOneActivity(id);
    const data: {
      publicationStatus: PublicationStatus;
      publishedAt?: Date | null;
      slug?: string;
      location?: string | null;
    } = { publicationStatus: dto.status };

    if (dto.location !== undefined) data.location = dto.location.trim() || null;

    if (dto.status === PublicationStatus.PUBLISHED) {
      if (!activity.slug) data.slug = await this.uniqueSlug(activity.title, id);
      if (!activity.publishedAt) data.publishedAt = new Date();
    }

    const updated = await this.prisma.activity.update({
      where: { id },
      data,
      include: { photos: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
    });

    await this.logPublication(performedById, dto.status, updated.title);
    this.siteRebuild.request(`événement « ${updated.title} » → ${dto.status}`);
    return updated;
  }

  /** Réglages de l'album : visibilité sur le site et photo de couverture. */
  async updateAlbum(id: string, dto: UpdateAlbumDto) {
    await this.findOneActivity(id);
    if (dto.coverPhotoId) {
      const photo = await this.prisma.photo.findUnique({ where: { id: dto.coverPhotoId } });
      if (!photo || photo.activityId !== id) {
        throw new BadRequestException('Cette photo n’appartient pas à l’événement.');
      }
    }
    const updated = await this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.albumVisible !== undefined && { albumVisible: dto.albumVisible }),
        ...(dto.coverPhotoId !== undefined && { coverPhotoId: dto.coverPhotoId || null }),
      },
      include: { photos: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (updated.publicationStatus === PublicationStatus.PUBLISHED) {
      this.siteRebuild.request(`album de « ${updated.title} »`);
    }
    return updated;
  }

  /** Une modification de l'événement publié change aussi le site. */
  private requestRebuildIfPublished(activity: { publicationStatus: PublicationStatus; title: string }) {
    if (activity.publicationStatus === PublicationStatus.PUBLISHED) {
      this.siteRebuild.request(`modification de « ${activity.title} »`);
    }
  }

  /** Légende, visibilité ou ordre d'une photo. */
  async updatePhoto(id: string, dto: UpdatePhotoDto) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: { activity: { select: { title: true, publicationStatus: true } } },
    });
    if (!photo) throw new NotFoundException('Photo introuvable');
    if (photo.activity) this.requestRebuildIfPublished(photo.activity);
    return this.prisma.photo.update({
      where: { id },
      data: {
        ...(dto.caption !== undefined && { caption: dto.caption.trim() || null }),
        ...(dto.visible !== undefined && { visible: dto.visible }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });
  }

  /** Nouvel ordre de l'album, dans l'ordre des identifiants reçus. */
  async reorderPhotos(activityId: string, photoIds: string[]) {
    const activity = await this.findOneActivity(activityId);
    this.requestRebuildIfPublished(activity);
    await this.prisma.$transaction(
      photoIds.map((photoId, index) =>
        this.prisma.photo.updateMany({
          where: { id: photoId, activityId },
          data: { position: index },
        }),
      ),
    );
    return this.getPhotosByActivity(activityId);
  }

  /** Journal : qui a publié ou retiré quoi, et quand (critère d'acceptation du cahier des charges). */
  private async logPublication(performedById: string, status: PublicationStatus, title: string) {
    const action =
      status === PublicationStatus.PUBLISHED
        ? 'EVENT_PUBLISHED'
        : status === PublicationStatus.ARCHIVED
          ? 'EVENT_ARCHIVED'
          : 'EVENT_UNPUBLISHED';
    await this.prisma.memberAuditLog
      .create({ data: { memberId: performedById, performedById, action, details: title } })
      .catch(() => undefined);
  }

  // ========== Lecture publique (aucune authentification, aucun brouillon) ==========

  /** Événements publiés, du plus proche au plus ancien, sans aucune donnée de membre. */
  async findPublicEvents(limit = 50) {
    const activities = await this.prisma.activity.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      orderBy: { date: 'desc' },
      take: Math.min(Math.max(1, limit), 100),
      include: {
        photos: {
          where: { visible: true },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, url: true, caption: true },
        },
      },
    });
    return activities.map((a) => this.toPublicEvent(a));
  }

  /** Un événement publié, par son adresse courte. */
  async findPublicEventBySlug(slug: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { slug, publicationStatus: PublicationStatus.PUBLISHED },
      include: {
        photos: {
          where: { visible: true },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, url: true, caption: true },
        },
      },
    });
    if (!activity) throw new NotFoundException('Événement introuvable');
    return this.toPublicEvent(activity);
  }

  /** Mise en forme publique : seuls les champs prévus, adresses d'images absolues. */
  private toPublicEvent(activity: {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    date: Date;
    endDate: Date | null;
    location: string | null;
    type: string;
    result: string | null;
    albumVisible: boolean;
    coverPhotoId: string | null;
    publishedAt: Date | null;
    photos: { id: string; url: string; caption: string | null }[];
  }) {
    const gallery = activity.albumVisible
      ? activity.photos.map((p) => ({ url: absoluteUrl(p.url), alt: p.caption ?? '' }))
      : [];
    const cover = activity.coverPhotoId
      ? activity.photos.find((p) => p.id === activity.coverPhotoId)
      : activity.photos[0];
    return {
      id: activity.id,
      slug: activity.slug,
      titre: activity.title,
      type: activity.type,
      debut: activity.date.toISOString(),
      fin: activity.endDate ? activity.endDate.toISOString() : null,
      lieu: activity.location,
      description_html: activity.description,
      resultat: activity.result,
      couverture: cover && activity.albumVisible
        ? { url: absoluteUrl(cover.url), alt: cover.caption ?? '' }
        : null,
      galerie: gallery,
      document: null,
      article_slug: null,
      publie_le: activity.publishedAt ? activity.publishedAt.toISOString() : null,
    };
  }
}
