export declare class WhatsappService {
    private readonly accessToken;
    private readonly phoneNumberId;
    isConfigured(): boolean;
    normalizePhone(phone: string): string;
    sendText(toPhone: string, body: string): Promise<{
        messageId: string;
    } | {
        error: string;
    } | null>;
    sendTemplate(toPhone: string, templateName: string, languageCode: string, bodyParams?: string[]): Promise<{
        messageId: string;
    } | {
        error: string;
    } | null>;
}
