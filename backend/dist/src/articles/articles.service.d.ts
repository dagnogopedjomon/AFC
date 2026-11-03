import { ArticleCategory, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SiteRebuildService } from '../public/site-rebuild.service';
import { UpdateArticleDto } from './dto/update-article.dto';
export declare class ArticlesService {
    private readonly prisma;
    private readonly siteRebuild;
    constructor(prisma: PrismaService, siteRebuild: SiteRebuildService);
    findAll(options?: {
        q?: string;
        statut?: PublicationStatus;
        categorie?: ArticleCategory;
    }): Promise<({
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@prisma/client").$Enums.ArticleCategory;
        title: string;
        createdById: string;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        excerpt: string | null;
        contentHtml: string;
        authorName: string | null;
        coverAlt: string | null;
        coverUrl: string | null;
    })[]>;
    findOne(id: string): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@prisma/client").$Enums.ArticleCategory;
        title: string;
        createdById: string;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        excerpt: string | null;
        contentHtml: string;
        authorName: string | null;
        coverAlt: string | null;
        coverUrl: string | null;
    }>;
    create(champs: {
        title: string;
        excerpt?: string;
        contentHtml?: string;
        category?: ArticleCategory;
        authorName?: string;
        publishedAt?: Date;
    }, createdById: string): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@prisma/client").$Enums.ArticleCategory;
        title: string;
        createdById: string;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        excerpt: string | null;
        contentHtml: string;
        authorName: string | null;
        coverAlt: string | null;
        coverUrl: string | null;
    }>;
    update(id: string, dto: UpdateArticleDto): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@prisma/client").$Enums.ArticleCategory;
        title: string;
        createdById: string;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        excerpt: string | null;
        contentHtml: string;
        authorName: string | null;
        coverAlt: string | null;
        coverUrl: string | null;
    }>;
    setCover(id: string, cover: {
        url: string;
        alt?: string;
    } | null): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@prisma/client").$Enums.ArticleCategory;
        title: string;
        createdById: string;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        excerpt: string | null;
        contentHtml: string;
        authorName: string | null;
        coverAlt: string | null;
        coverUrl: string | null;
    }>;
    setPublication(id: string, status: PublicationStatus, publishedAt: string | undefined, performedById: string): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@prisma/client").$Enums.ArticleCategory;
        title: string;
        createdById: string;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        excerpt: string | null;
        contentHtml: string;
        authorName: string | null;
        coverAlt: string | null;
        coverUrl: string | null;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    private rebuildSiPublie;
    private uniqueSlug;
    private logPublication;
    findPublicArticles(limit?: number): Promise<{
        id: string;
        slug: string | null;
        titre: string;
        extrait: string;
        corps_html: string;
        categorie: string;
        auteur: string;
        couverture: {
            url: string;
            alt: string;
        } | null;
        publie_le: string | null;
    }[]>;
    findPublicArticleBySlug(slug: string): Promise<{
        id: string;
        slug: string | null;
        titre: string;
        extrait: string;
        corps_html: string;
        categorie: string;
        auteur: string;
        couverture: {
            url: string;
            alt: string;
        } | null;
        publie_le: string | null;
    }>;
    private toPublicArticle;
}
