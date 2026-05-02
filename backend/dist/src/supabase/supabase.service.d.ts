export declare class SupabaseService {
    private client;
    private bucket;
    constructor();
    isConfigured(): boolean;
    uploadAvatar(buffer: Buffer, mimetype: string, userId: string): Promise<string>;
}
