import { ArticleCategory } from '@prisma/client';
export declare class UpdateArticleDto {
    title?: string;
    excerpt?: string;
    contentHtml?: string;
    category?: ArticleCategory;
    authorName?: string;
    publishedAt?: string;
    coverAlt?: string;
}
