import { ArticleCategory, PublicationStatus } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PublishArticleDto } from './dto/publish-article.dto';
import type { RequestUser } from '../auth/jwt.strategy';
import { SupabaseService } from '../supabase/supabase.service';
export declare class ArticlesController {
    private readonly articles;
    private readonly supabase;
    constructor(articles: ArticlesService, supabase: SupabaseService);
    findAll(q?: string, statut?: PublicationStatus, categorie?: ArticleCategory): Promise<({
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
    create(dto: UpdateArticleDto, user: RequestUser): Promise<{
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
    setCover(id: string, file: Express.Multer.File | undefined, alt: string | undefined): Promise<{
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
    removeCover(id: string): Promise<{
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
    uploadImage(id: string, file: Express.Multer.File | undefined): Promise<{
        url: string;
    }>;
    setPublication(id: string, dto: PublishArticleDto, user: RequestUser): Promise<{
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
    private rangerImage;
}
