import { PublicationStatus } from '@prisma/client';
export declare class PublishActivityDto {
    status: PublicationStatus;
    location?: string;
}
