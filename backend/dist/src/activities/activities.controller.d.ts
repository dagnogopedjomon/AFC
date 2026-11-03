import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { PublishActivityDto } from './dto/publish-activity.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import type { RequestUser } from '../auth/jwt.strategy';
import { SupabaseService } from '../supabase/supabase.service';
export declare class ActivitiesController {
    private readonly activitiesService;
    private readonly supabase;
    constructor(activitiesService: ActivitiesService, supabase: SupabaseService);
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
    findAllActivities(): Promise<({
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
    getRecentCount(user: RequestUser): Promise<{
        count: number;
    }>;
    markActivitiesSeen(user: RequestUser): Promise<{
        ok: boolean;
    }>;
    findAllAnnouncements(): Promise<({
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
    createAnnouncement(dto: CreateAnnouncementDto, user: RequestUser): Promise<{
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
    createPhoto(dto: CreatePhotoDto, user: RequestUser): Promise<{
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
    uploadPhoto(file: Express.Multer.File | undefined, activityId: string, caption: string | undefined, user: RequestUser): Promise<{
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
    setPublication(id: string, dto: PublishActivityDto, user: RequestUser): Promise<{
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
    reorderPhotos(id: string, photoIds: string[]): Promise<({
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
    deletePhoto(id: string): Promise<{
        success: boolean;
    }>;
    getPhotosByActivity(id: string): Promise<({
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
}
