import { ActivityType } from '@prisma/client';
export declare class CreateActivityDto {
    type: ActivityType;
    title: string;
    description?: string;
    date: string;
    endDate?: string;
    result?: string;
}
