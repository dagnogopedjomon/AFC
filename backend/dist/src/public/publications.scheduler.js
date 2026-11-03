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
var PublicationsScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicationsScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const site_rebuild_service_1 = require("./site-rebuild.service");
let PublicationsScheduler = PublicationsScheduler_1 = class PublicationsScheduler {
    prisma;
    siteRebuild;
    logger = new common_1.Logger(PublicationsScheduler_1.name);
    depuis = new Date();
    constructor(prisma, siteRebuild) {
        this.prisma = prisma;
        this.siteRebuild = siteRebuild;
    }
    onModuleInit() {
        if (!this.siteRebuild.isConfigured()) {
            this.logger.warn('Reconstruction du site non configurée : les articles programmés ne sortiront pas tout seuls ' +
                '(voir SITE_REBUILD_DISPATCH_URL et SITE_REBUILD_DISPATCH_TOKEN).');
        }
    }
    async sortirLesArticlesProgrammes() {
        const jusqua = new Date();
        const depuis = this.depuis;
        this.depuis = jusqua;
        try {
            const parus = await this.prisma.article.findMany({
                where: {
                    publicationStatus: client_1.PublicationStatus.PUBLISHED,
                    slug: { not: null },
                    publishedAt: { gt: depuis, lte: jusqua },
                },
                select: { id: true, title: true, createdById: true },
            });
            if (parus.length === 0)
                return;
            for (const article of parus) {
                await this.prisma.memberAuditLog
                    .create({
                    data: {
                        memberId: article.createdById,
                        performedById: article.createdById,
                        action: 'ARTICLE_RELEASED',
                        details: article.title,
                    },
                })
                    .catch(() => undefined);
            }
            const quoi = parus.length === 1
                ? `article « ${parus[0].title} »`
                : `${parus.length} articles programmés`;
            this.logger.log(`Parution programmée : ${quoi}.`);
            this.siteRebuild.request(`parution programmée — ${quoi}`);
        }
        catch (err) {
            this.logger.error('Articles programmés : lecture impossible.', err);
            this.depuis = depuis;
        }
    }
};
exports.PublicationsScheduler = PublicationsScheduler;
__decorate([
    (0, schedule_1.Cron)('*/5 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicationsScheduler.prototype, "sortirLesArticlesProgrammes", null);
exports.PublicationsScheduler = PublicationsScheduler = PublicationsScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        site_rebuild_service_1.SiteRebuildService])
], PublicationsScheduler);
//# sourceMappingURL=publications.scheduler.js.map