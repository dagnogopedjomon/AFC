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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const site_rebuild_service_1 = require("../public/site-rebuild.service");
function absoluteUrl(url) {
    if (/^https?:\/\//i.test(url))
        return url;
    const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
}
const NOM_CATEGORIE = {
    STATUTS: 'Statuts',
    REGLEMENT: 'Règlement',
    COMPTES_RENDUS: 'Comptes rendus',
    AUTRES: 'Autres',
};
let DocumentsService = class DocumentsService {
    prisma;
    siteRebuild;
    constructor(prisma, siteRebuild) {
        this.prisma = prisma;
        this.siteRebuild = siteRebuild;
    }
    async findAll(options = {}) {
        const where = {};
        if (options.statut)
            where.publicationStatus = options.statut;
        if (options.categorie)
            where.category = options.categorie;
        if (options.q?.trim()) {
            const q = options.q.trim();
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
            ];
        }
        return this.prisma.document.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
    }
    async findOne(id) {
        const document = await this.prisma.document.findUnique({
            where: { id },
            include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (!document)
            throw new common_1.NotFoundException('Document introuvable');
        return document;
    }
    async create(champs, fichier, uploadedById) {
        const title = champs.title?.trim();
        if (!title)
            throw new common_1.BadRequestException('Le titre est obligatoire.');
        return this.prisma.document.create({
            data: {
                title,
                description: champs.description?.trim() || null,
                category: champs.category ?? client_1.DocumentCategory.AUTRES,
                date: champs.date ?? new Date(),
                fileUrl: fichier.url,
                fileName: fichier.name,
                fileType: fichier.type,
                fileSize: fichier.size,
                uploadedById,
            },
            include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
    }
    async update(id, dto) {
        const existant = await this.findOne(id);
        const data = {};
        if (dto.title !== undefined) {
            const title = dto.title.trim();
            if (!title)
                throw new common_1.BadRequestException('Le titre est obligatoire.');
            data.title = title;
        }
        if (dto.description !== undefined)
            data.description = dto.description.trim() || null;
        if (dto.category !== undefined)
            data.category = dto.category;
        if (dto.date !== undefined)
            data.date = new Date(dto.date);
        const updated = await this.prisma.document.update({
            where: { id },
            data,
            include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (existant.publicationStatus === client_1.PublicationStatus.PUBLISHED) {
            this.siteRebuild.request(`modification du document « ${updated.title} »`);
        }
        return updated;
    }
    async replaceFile(id, fichier) {
        const existant = await this.findOne(id);
        const updated = await this.prisma.document.update({
            where: { id },
            data: {
                fileUrl: fichier.url,
                fileName: fichier.name,
                fileType: fichier.type,
                fileSize: fichier.size,
            },
            include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (existant.publicationStatus === client_1.PublicationStatus.PUBLISHED) {
            this.siteRebuild.request(`nouveau fichier pour « ${updated.title} »`);
        }
        return updated;
    }
    async setPublication(id, status, performedById) {
        const existant = await this.findOne(id);
        const updated = await this.prisma.document.update({
            where: { id },
            data: {
                publicationStatus: status,
                ...(status === client_1.PublicationStatus.PUBLISHED &&
                    !existant.publishedAt && { publishedAt: new Date() }),
            },
            include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        await this.logPublication(performedById, status, updated.title);
        this.siteRebuild.request(`document « ${updated.title} » → ${status}`);
        return updated;
    }
    async remove(id) {
        const document = await this.findOne(id);
        await this.prisma.document.delete({ where: { id } });
        if (document.publicationStatus === client_1.PublicationStatus.PUBLISHED) {
            this.siteRebuild.request(`suppression du document « ${document.title} »`);
        }
        return { deleted: true };
    }
    async logPublication(performedById, status, title) {
        const action = status === client_1.PublicationStatus.PUBLISHED
            ? 'DOCUMENT_PUBLISHED'
            : status === client_1.PublicationStatus.ARCHIVED
                ? 'DOCUMENT_ARCHIVED'
                : 'DOCUMENT_UNPUBLISHED';
        await this.prisma.memberAuditLog
            .create({ data: { memberId: performedById, performedById, action, details: title } })
            .catch(() => undefined);
    }
    async findPublicDocuments() {
        const documents = await this.prisma.document.findMany({
            where: { publicationStatus: client_1.PublicationStatus.PUBLISHED },
            orderBy: [{ date: 'desc' }],
        });
        return documents.map((d) => ({
            titre: d.title,
            description: d.description ?? '',
            categorie: NOM_CATEGORIE[d.category],
            date: d.date.toISOString(),
            fichier: {
                url: absoluteUrl(d.fileUrl),
                taille_octets: d.fileSize,
                type: d.fileType,
            },
            publie_le: (d.publishedAt ?? d.createdAt).toISOString(),
        }));
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        site_rebuild_service_1.SiteRebuildService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map