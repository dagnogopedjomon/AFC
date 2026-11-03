import { PublicationStatus } from '@prisma/client';
export declare class PublishArticleDto {
    status: PublicationStatus;
    publishedAt?: string;
}
