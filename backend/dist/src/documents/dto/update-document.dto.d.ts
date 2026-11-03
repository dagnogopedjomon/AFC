import { DocumentCategory } from '@prisma/client';
export declare class UpdateDocumentDto {
    title?: string;
    description?: string;
    category?: DocumentCategory;
    date?: string;
}
