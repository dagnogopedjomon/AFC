import { ActivityType } from '@prisma/client';
export declare class UpdateActivityDto {
    type?: ActivityType;
    title?: string;
    description?: string;
    date?: string;
    endDate?: string;
    result?: string;
    location?: string;
}
