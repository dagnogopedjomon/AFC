import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class ActivitiesController {
    private readonly activitiesService;
    constructor(activitiesService: ActivitiesService);
    createActivity(dto: CreateActivityDto): Promise<{
        result: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        title: string;
        date: Date;
    }>;
    findAllActivities(): Promise<({
        _count: {
            photos: number;
        };
    } & {
        result: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        title: string;
        date: Date;
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
        title: string;
        content: string;
        authorId: string;
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
        title: string;
        content: string;
        authorId: string;
    }>;
    findOneActivity(id: string): Promise<{
        photos: {
            id: string;
            createdAt: Date;
            url: string;
            caption: string | null;
            activityId: string | null;
            uploadedById: string;
        }[];
    } & {
        result: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.ActivityType;
        endDate: Date | null;
        description: string | null;
        title: string;
        date: Date;
    }>;
    createPhoto(dto: CreatePhotoDto, user: RequestUser): Promise<{
        activity: {
            result: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.ActivityType;
            endDate: Date | null;
            description: string | null;
            title: string;
            date: Date;
        } | null;
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        url: string;
        caption: string | null;
        activityId: string | null;
        uploadedById: string;
    }>;
    getPhotosByActivity(id: string): Promise<({
        uploadedBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        url: string;
        caption: string | null;
        activityId: string | null;
        uploadedById: string;
    })[]>;
}
