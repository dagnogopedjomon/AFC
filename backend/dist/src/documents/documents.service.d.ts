import { DocumentCategory, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SiteRebuildService } from '../public/site-rebuild.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
export declare class DocumentsService {
    private readonly prisma;
    private readonly siteRebuild;
    constructor(prisma: PrismaService, siteRebuild: SiteRebuildService);
    findAll(options?: {
        q?: string;
        statut?: PublicationStatus;
        categorie?: DocumentCategory;
    }): Promise<({
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: import("@prisma/client").$Enums.DocumentCategory;
        uploadedById: string;
        date: Date;
        title: string;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        fileUrl: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    })[]>;
    findOne(id: string): Promise<{
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: import("@prisma/client").$Enums.DocumentCategory;
        uploadedById: string;
        date: Date;
        title: string;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        fileUrl: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }>;
    create(champs: {
        title: string;
        description?: string;
        category?: DocumentCategory;
        date?: Date;
    }, fichier: {
        url: string;
        name: string;
        type: string;
        size: number;
    }, uploadedById: string): Promise<{
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: import("@prisma/client").$Enums.DocumentCategory;
        uploadedById: string;
        date: Date;
        title: string;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        fileUrl: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }>;
    update(id: string, dto: UpdateDocumentDto): Promise<{
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: import("@prisma/client").$Enums.DocumentCategory;
        uploadedById: string;
        date: Date;
        title: string;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        fileUrl: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }>;
    replaceFile(id: string, fichier: {
        url: string;
        name: string;
        type: string;
        size: number;
    }): Promise<{
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: import("@prisma/client").$Enums.DocumentCategory;
        uploadedById: string;
        date: Date;
        title: string;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        fileUrl: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }>;
    setPublication(id: string, status: PublicationStatus, performedById: string): Promise<{
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: import("@prisma/client").$Enums.DocumentCategory;
        uploadedById: string;
        date: Date;
        title: string;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
        fileUrl: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    private logPublication;
    findPublicDocuments(): Promise<{
        titre: string;
        description: string;
        categorie: string;
        date: string;
        fichier: {
            url: string;
            taille_octets: number;
            type: string;
        };
        publie_le: string;
    }[]>;
}
