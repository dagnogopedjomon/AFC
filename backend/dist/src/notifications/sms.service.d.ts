export declare class SmsService {
    private readonly apiKey;
    private readonly from;
    isConfigured(): boolean;
    send(toPhone: string, body: string): Promise<{
        messageId: string;
    } | null>;
}
