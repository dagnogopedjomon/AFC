export declare class SupabaseService {
    private client;
    private bucket;
    constructor();
    isConfigured(): boolean;
    uploadAvatar(buffer: Buffer, mimetype: string, userId: string): Promise<string>;
    uploadDocument(buffer: Buffer, mimetype: string, documentId: string, filename: string): Promise<string>;
    uploadArticleImage(buffer: Buffer, mimetype: string, articleId: string): Promise<string>;
    uploadActivityPhoto(buffer: Buffer, mimetype: string, activityId: string): Promise<string>;
}
