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
let ActivitiesService = class ActivitiesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
            orderBy: { createdAt: 'desc' },
            include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        });
    }
};
exports.ActivitiesService = ActivitiesService;
exports.ActivitiesService = ActivitiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivitiesService);
//# sourceMappingURL=activities.service.js.map