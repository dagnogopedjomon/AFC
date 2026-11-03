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
exports.ArticlesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const site_rebuild_service_1 = require("../public/site-rebuild.service");
const sanitize_html_1 = require("../common/sanitize-html");
function absoluteUrl(url) {
    if (/^https?:\/\//i.test(url))
        return url;
    const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
}
function slugify(value) {
    return (value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'article');
}
const NOM_CATEGORIE = {
    VIE_DU_CLUB: 'Vie du club',
    REGLES: 'Règles',
    COMMUNIQUES: 'Communiqués',
    COMPTES_RENDUS: 'Comptes rendus',
};
function extraitAuto(contentHtml) {
    const texte = (0, sanitize_html_1.richTextToPlain)(contentHtml);
    if (!texte)
        return '';
    const phrases = texte.match(/[^.!?]+[.!?]*/g) ?? [texte];
    const deux = phrases.slice(0, 2).join('').trim();
    return deux.length > 280 ? `${deux.slice(0, 277).trimEnd()}…` : deux;
}
const AUTEUR = { select: { id: true, firstName: true, lastName: true } };
let ArticlesService = class ArticlesService {
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
                { excerpt: { contains: q, mode: 'insensitive' } },
            ];
        }
        return this.prisma.article.findMany({
            where,
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            include: { createdBy: AUTEUR },
        });
    }
    async findOne(id) {
        const article = await this.prisma.article.findUnique({
            where: { id },
            include: { createdBy: AUTEUR },
        });
        if (!article)
            throw new common_1.NotFoundException('Article introuvable');
        return article;
    }
    async create(champs, createdById) {
        const title = champs.title?.trim();
        if (!title)
            throw new common_1.BadRequestException('Le titre est obligatoire.');
        const contentHtml = (0, sanitize_html_1.sanitizeRichText)(champs.contentHtml);
        return this.prisma.article.create({
            data: {
                title,
                excerpt: champs.excerpt?.trim() || extraitAuto(contentHtml) || null,
                contentHtml,
                category: champs.category ?? client_1.ArticleCategory.VIE_DU_CLUB,
                authorName: champs.authorName?.trim() || null,
                publishedAt: champs.publishedAt ?? null,
                createdById,
            },
            include: { createdBy: AUTEUR },
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
            if (!existant.slug && existant.publicationStatus !== client_1.PublicationStatus.PUBLISHED) {
                data.slug = null;
            }
        }
        if (dto.contentHtml !== undefined)
            data.contentHtml = (0, sanitize_html_1.sanitizeRichText)(dto.contentHtml);
        if (dto.excerpt !== undefined) {
            const excerpt = dto.excerpt.trim();
            const corps = typeof data.contentHtml === 'string' ? data.contentHtml : existant.contentHtml;
            data.excerpt = excerpt || extraitAuto(corps) || null;
        }
        else if (dto.contentHtml !== undefined && !existant.excerpt) {
            data.excerpt = extraitAuto(data.contentHtml) || null;
        }
        if (dto.category !== undefined)
            data.category = dto.category;
        if (dto.authorName !== undefined)
            data.authorName = dto.authorName.trim() || null;
        if (dto.publishedAt !== undefined) {
            data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
        }
        if (dto.coverAlt !== undefined)
            data.coverAlt = dto.coverAlt.trim() || null;
        const updated = await this.prisma.article.update({
            where: { id },
            data,
            include: { createdBy: AUTEUR },
        });
        this.rebuildSiPublie(existant, `modification de l'article « ${updated.title} »`);
        return updated;
    }
    async setCover(id, cover) {
        const existant = await this.findOne(id);
        const updated = await this.prisma.article.update({
            where: { id },
            data: {
                coverUrl: cover?.url ?? null,
                coverAlt: cover ? cover.alt?.trim() || existant.coverAlt : null,
            },
            include: { createdBy: AUTEUR },
        });
        this.rebuildSiPublie(existant, `couverture de « ${updated.title} »`);
        return updated;
    }
    async setPublication(id, status, publishedAt, performedById) {
        const existant = await this.findOne(id);
        const data = { publicationStatus: status };
        if (publishedAt !== undefined) {
            const date = new Date(publishedAt);
            if (Number.isNaN(date.getTime()))
                throw new common_1.BadRequestException('Date de parution illisible.');
            data.publishedAt = date;
        }
        if (status === client_1.PublicationStatus.PUBLISHED) {
            if (!existant.contentHtml.trim()) {
                throw new common_1.BadRequestException("Cet article est vide : il n'y a rien à publier.");
            }
            if (!existant.slug)
                data.slug = await this.uniqueSlug(existant.title, id);
            if (publishedAt === undefined && !existant.publishedAt)
                data.publishedAt = new Date();
        }
        const updated = await this.prisma.article.update({
            where: { id },
            data,
            include: { createdBy: AUTEUR },
        });
        await this.logPublication(performedById, status, updated.title);
        this.siteRebuild.request(`article « ${updated.title} » → ${status}`);
        return updated;
    }
    async remove(id) {
        const article = await this.findOne(id);
        await this.prisma.article.delete({ where: { id } });
        this.rebuildSiPublie(article, `suppression de l'article « ${article.title} »`);
        return { deleted: true };
    }
    rebuildSiPublie(article, raison) {
        if (article.publicationStatus === client_1.PublicationStatus.PUBLISHED) {
            this.siteRebuild.request(raison);
        }
    }
    async uniqueSlug(title, articleId) {
        const base = slugify(title);
        let candidate = base;
        for (let i = 2; i < 50; i++) {
            const existing = await this.prisma.article.findUnique({ where: { slug: candidate } });
            if (!existing || existing.id === articleId)
                return candidate;
            candidate = `${base}-${i}`;
        }
        return `${base}-${articleId.slice(-6)}`;
    }
    async logPublication(performedById, status, title) {
        const action = status === client_1.PublicationStatus.PUBLISHED
            ? 'ARTICLE_PUBLISHED'
            : status === client_1.PublicationStatus.ARCHIVED
                ? 'ARTICLE_ARCHIVED'
                : 'ARTICLE_UNPUBLISHED';
        await this.prisma.memberAuditLog
            .create({ data: { memberId: performedById, performedById, action, details: title } })
            .catch(() => undefined);
    }
    async findPublicArticles(limit = 100) {
        const articles = await this.prisma.article.findMany({
            where: {
                publicationStatus: client_1.PublicationStatus.PUBLISHED,
                slug: { not: null },
                publishedAt: { not: null, lte: new Date() },
            },
            orderBy: { publishedAt: 'desc' },
            take: Math.min(Math.max(1, limit), 200),
        });
        return articles.map((a) => this.toPublicArticle(a));
    }
    async findPublicArticleBySlug(slug) {
        const article = await this.prisma.article.findFirst({
            where: {
                slug,
                publicationStatus: client_1.PublicationStatus.PUBLISHED,
                publishedAt: { not: null, lte: new Date() },
            },
        });
        if (!article)
            throw new common_1.NotFoundException('Article introuvable');
        return this.toPublicArticle(article);
    }
    toPublicArticle(article) {
        return {
            id: article.id,
            slug: article.slug,
            titre: article.title,
            extrait: article.excerpt ?? '',
            corps_html: article.contentHtml,
            categorie: NOM_CATEGORIE[article.category],
            auteur: article.authorName ?? '',
            couverture: article.coverUrl
                ? { url: absoluteUrl(article.coverUrl), alt: article.coverAlt ?? '' }
                : null,
            publie_le: article.publishedAt ? article.publishedAt.toISOString() : null,
        };
    }
};
exports.ArticlesService = ArticlesService;
exports.ArticlesService = ArticlesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        site_rebuild_service_1.SiteRebuildService])
], ArticlesService);
//# sourceMappingURL=articles.service.js.map