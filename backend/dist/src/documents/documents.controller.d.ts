import { DocumentCategory, PublicationStatus } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PublishDocumentDto } from './dto/publish-document.dto';
import type { RequestUser } from '../auth/jwt.strategy';
import { SupabaseService } from '../supabase/supabase.service';
export declare class DocumentsController {
    private readonly documents;
    private readonly supabase;
    constructor(documents: DocumentsService, supabase: SupabaseService);
    findAll(q?: string, statut?: PublicationStatus, categorie?: DocumentCategory): Promise<({
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
    create(file: Express.Multer.File | undefined, title: string, description: string | undefined, category: DocumentCategory | undefined, date: string | undefined, user: RequestUser): Promise<{
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
    replaceFile(id: string, file: Express.Multer.File | undefined): Promise<{
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
    setPublication(id: string, dto: PublishDocumentDto, user: RequestUser): Promise<{
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
    private rangerFichier;
    private categorieValide;
    private dateValide;
}
