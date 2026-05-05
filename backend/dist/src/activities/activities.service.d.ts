import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
export declare class ActivitiesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    getRecentCount(memberId: string): Promise<number>;
    markActivitiesSeen(memberId: string): Promise<{
        ok: boolean;
    }>;
    findAllActivities(limit?: number): Promise<({
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
    findOneActivity(id: string): Promise<{
        photos: {
            id: string;
            createdAt: Date;
            uploadedById: string;
            url: string;
            caption: string | null;
            activityId: string | null;
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
        uploadedById: string;
        url: string;
        caption: string | null;
        activityId: string | null;
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
    })[]>;
}
