export type SayelesendChannel = 'sms' | 'whatsapp' | 'telegram' | 'facebook_messenger';
export type SayelesendSendOptions = {
    apiKey: string;
    to: string;
    message: string;
    channel: SayelesendChannel;
    from?: string;
    scheduledAt?: number;
    logPrefix?: string;
};
export type SayelesendResult = {
    messageId: string;
} | {
    error: string;
} | null;
export declare function normalizeE164(phone: string): string;
export declare function sayelesendSend(opts: SayelesendSendOptions): Promise<SayelesendResult>;
