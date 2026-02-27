export declare class SmsService {
    private readonly apiUrl;
    private readonly client;
    private readonly password;
    private readonly from;
    isConfigured(): boolean;
    private normalizePhone;
    private parseXmlResponse;
    send(toPhone: string, body: string): Promise<{
        messageId: string;
    } | null>;
}
