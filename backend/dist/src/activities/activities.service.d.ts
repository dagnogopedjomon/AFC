import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { PublishActivityDto } from './dto/publish-activity.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { SiteRebuildService } from '../public/site-rebuild.service';
export declare class ActivitiesService {
    private readonly prisma;
    private readonly siteRebuild;
    constructor(prisma: PrismaService, siteRebuild: SiteRebuildService);
    createActivity(dto: CreateActivityDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        result: string | null;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        date: Date;
        title: string;
        location: string | null;
        albumVisible: boolean;
        coverPhotoId: string | null;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
    }>;
    getRecentCount(memberId: string): Promise<number>;
    markActivitiesSeen(memberId: string): Promise<{
        ok: boolean;
    }>;
    findAllActivities(limit?: number): Promise<({
        _count: {
            photos: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        result: string | null;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        date: Date;
        title: string;
        location: string | null;
        albumVisible: boolean;
        coverPhotoId: string | null;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
    })[]>;
    findOneActivity(id: string): Promise<{
        photos: {
            id: string;
            createdAt: Date;
            uploadedById: string;
            url: string;
            caption: string | null;
            activityId: string | null;
            visible: boolean;
            position: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        result: string | null;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        date: Date;
        title: string;
        location: string | null;
        albumVisible: boolean;
        coverPhotoId: string | null;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
    }>;
    updateActivity(id: string, dto: UpdateActivityDto): Promise<{
        photos: {
            id: string;
            createdAt: Date;
            uploadedById: string;
            url: string;
            caption: string | null;
            activityId: string | null;
            visible: boolean;
            position: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        result: string | null;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        date: Date;
        title: string;
        location: string | null;
        albumVisible: boolean;
        coverPhotoId: string | null;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
    }>;
    deleteActivity(id: string): Promise<{
        success: boolean;
    }>;
    deletePhoto(id: string): Promise<{
        success: boolean;
    }>;
    createAnnouncement(dto: CreateAnnouncementDto, authorId: string): Promise<{
        author: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        authorId: string;
        title: string;
        content: string;
    }>;
    findAllAnnouncements(limit?: number): Promise<({
        author: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        authorId: string;
        title: string;
        content: string;
    })[]>;
    createPhoto(dto: CreatePhotoDto, uploadedById: string): Promise<{
        activity: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            result: string | null;
            type: import("@prisma/client").$Enums.ActivityType;
            endDate: Date | null;
            description: string | null;
            date: Date;
            title: string;
            location: string | null;
            albumVisible: boolean;
            coverPhotoId: string | null;
            slug: string | null;
            publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
            publishedAt: Date | null;
        } | null;
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        uploadedById: string;
        url: string;
        caption: string | null;
        activityId: string | null;
        visible: boolean;
        position: number;
    }>;
    getPhotosByActivity(activityId: string): Promise<({
        uploadedBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        uploadedById: string;
        url: string;
        caption: string | null;
        activityId: string | null;
        visible: boolean;
        position: number;
    })[]>;
    private uniqueSlug;
    setPublication(id: string, dto: PublishActivityDto, performedById: string): Promise<{
        photos: {
            id: string;
            createdAt: Date;
            uploadedById: string;
            url: string;
            caption: string | null;
            activityId: string | null;
            visible: boolean;
            position: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        result: string | null;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        date: Date;
        title: string;
        location: string | null;
        albumVisible: boolean;
        coverPhotoId: string | null;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
    }>;
    updateAlbum(id: string, dto: UpdateAlbumDto): Promise<{
        photos: {
            id: string;
            createdAt: Date;
            uploadedById: string;
            url: string;
            caption: string | null;
            activityId: string | null;
            visible: boolean;
            position: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        result: string | null;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        date: Date;
        title: string;
        location: string | null;
        albumVisible: boolean;
        coverPhotoId: string | null;
        slug: string | null;
        publicationStatus: import("@prisma/client").$Enums.PublicationStatus;
        publishedAt: Date | null;
    }>;
    private requestRebuildIfPublished;
    updatePhoto(id: string, dto: UpdatePhotoDto): Promise<{
        id: string;
        createdAt: Date;
        uploadedById: string;
        url: string;
        caption: string | null;
        activityId: string | null;
        visible: boolean;
        position: number;
    }>;
    reorderPhotos(activityId: string, photoIds: string[]): Promise<({
        uploadedBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        uploadedById: string;
        url: string;
        caption: string | null;
        activityId: string | null;
        visible: boolean;
        position: number;
    })[]>;
    private logPublication;
    findPublicEvents(limit?: number): Promise<{
        id: string;
        slug: string | null;
        titre: string;
        type: string;
        debut: string;
        fin: string | null;
        lieu: string | null;
        description_html: string | null;
        resultat: string | null;
        couverture: {
            url: string;
            alt: string;
        } | null;
        galerie: {
            url: string;
            alt: string;
        }[];
        document: null;
        article_slug: null;
        publie_le: string | null;
    }[]>;
    findPublicEventBySlug(slug: string): Promise<{
        id: string;
        slug: string | null;
        titre: string;
        type: string;
        debut: string;
        fin: string | null;
        lieu: string | null;
        description_html: string | null;
        resultat: string | null;
        couverture: {
            url: string;
            alt: string;
        } | null;
        galerie: {
            url: string;
            alt: string;
        }[];
        document: null;
        article_slug: null;
        publie_le: string | null;
    }>;
    private toPublicEvent;
}
