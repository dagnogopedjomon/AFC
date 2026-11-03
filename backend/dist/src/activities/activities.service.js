"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const site_rebuild_service_1 = require("../public/site-rebuild.service");
function absoluteUrl(url) {
    if (/^https?:\/\//i.test(url))
        return url;
    const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
}
function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'evenement';
}
let ActivitiesService = class ActivitiesService {
    prisma;
    siteRebuild;
    constructor(prisma, siteRebuild) {
        this.prisma = prisma;
        this.siteRebuild = siteRebuild;
    }
    async createActivity(dto) {
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
    async getRecentCount(memberId) {
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
    async markActivitiesSeen(memberId) {
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
    async findOneActivity(id) {
        const a = await this.prisma.activity.findUnique({
            where: { id },
            include: { photos: true },
        });
        if (!a)
            throw new common_1.NotFoundException('Activité introuvable');
        return a;
    }
    async updateActivity(id, dto) {
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
    async deleteActivity(id) {
        const a = await this.findOneActivity(id);
        this.requestRebuildIfPublished(a);
        await this.prisma.photo.deleteMany({ where: { activityId: id } });
        await this.prisma.activity.delete({ where: { id } });
        return { success: true };
    }
    async deletePhoto(id) {
        const p = await this.prisma.photo.findUnique({
            where: { id },
            include: { activity: { select: { title: true, publicationStatus: true } } },
        });
        if (!p)
            throw new common_1.NotFoundException('Photo introuvable');
        if (p.activity)
            this.requestRebuildIfPublished(p.activity);
        await this.prisma.photo.delete({ where: { id } });
        return { success: true };
    }
    async createAnnouncement(dto, authorId) {
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
    async createPhoto(dto, uploadedById) {
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
    async getPhotosByActivity(activityId) {
        return this.prisma.photo.findMany({
            where: { activityId },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        });
    }
    async uniqueSlug(title, activityId) {
        const base = slugify(title);
        let candidate = base;
        for (let i = 2; i < 50; i++) {
            const existing = await this.prisma.activity.findUnique({ where: { slug: candidate } });
            if (!existing || existing.id === activityId)
                return candidate;
            candidate = `${base}-${i}`;
        }
        return `${base}-${activityId.slice(-6)}`;
    }
    async setPublication(id, dto, performedById) {
        const activity = await this.findOneActivity(id);
        const data = { publicationStatus: dto.status };
        if (dto.location !== undefined)
            data.location = dto.location.trim() || null;
        if (dto.status === client_1.PublicationStatus.PUBLISHED) {
            if (!activity.slug)
                data.slug = await this.uniqueSlug(activity.title, id);
            if (!activity.publishedAt)
                data.publishedAt = new Date();
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
    async updateAlbum(id, dto) {
        await this.findOneActivity(id);
        if (dto.coverPhotoId) {
            const photo = await this.prisma.photo.findUnique({ where: { id: dto.coverPhotoId } });
            if (!photo || photo.activityId !== id) {
                throw new common_1.BadRequestException('Cette photo n’appartient pas à l’événement.');
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
        if (updated.publicationStatus === client_1.PublicationStatus.PUBLISHED) {
            this.siteRebuild.request(`album de « ${updated.title} »`);
        }
        return updated;
    }
    requestRebuildIfPublished(activity) {
        if (activity.publicationStatus === client_1.PublicationStatus.PUBLISHED) {
            this.siteRebuild.request(`modification de « ${activity.title} »`);
        }
    }
    async updatePhoto(id, dto) {
        const photo = await this.prisma.photo.findUnique({
            where: { id },
            include: { activity: { select: { title: true, publicationStatus: true } } },
        });
        if (!photo)
            throw new common_1.NotFoundException('Photo introuvable');
        if (photo.activity)
            this.requestRebuildIfPublished(photo.activity);
        return this.prisma.photo.update({
            where: { id },
            data: {
                ...(dto.caption !== undefined && { caption: dto.caption.trim() || null }),
                ...(dto.visible !== undefined && { visible: dto.visible }),
                ...(dto.position !== undefined && { position: dto.position }),
            },
        });
    }
    async reorderPhotos(activityId, photoIds) {
        const activity = await this.findOneActivity(activityId);
        this.requestRebuildIfPublished(activity);
        await this.prisma.$transaction(photoIds.map((photoId, index) => this.prisma.photo.updateMany({
            where: { id: photoId, activityId },
            data: { position: index },
        })));
        return this.getPhotosByActivity(activityId);
    }
    async logPublication(performedById, status, title) {
        const action = status === client_1.PublicationStatus.PUBLISHED
            ? 'EVENT_PUBLISHED'
            : status === client_1.PublicationStatus.ARCHIVED
                ? 'EVENT_ARCHIVED'
                : 'EVENT_UNPUBLISHED';
        await this.prisma.memberAuditLog
            .create({ data: { memberId: performedById, performedById, action, details: title } })
            .catch(() => undefined);
    }
    async findPublicEvents(limit = 50) {
        const activities = await this.prisma.activity.findMany({
            where: { publicationStatus: client_1.PublicationStatus.PUBLISHED },
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
    async findPublicEventBySlug(slug) {
        const activity = await this.prisma.activity.findFirst({
            where: { slug, publicationStatus: client_1.PublicationStatus.PUBLISHED },
            include: {
                photos: {
                    where: { visible: true },
                    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
                    select: { id: true, url: true, caption: true },
                },
            },
        });
        if (!activity)
            throw new common_1.NotFoundException('Événement introuvable');
        return this.toPublicEvent(activity);
    }
    toPublicEvent(activity) {
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
};
exports.ActivitiesService = ActivitiesService;
exports.ActivitiesService = ActivitiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        site_rebuild_service_1.SiteRebuildService])
], ActivitiesService);
//# sourceMappingURL=activities.service.js.map