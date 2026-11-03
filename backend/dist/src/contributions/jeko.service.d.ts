import { PrismaService } from '../prisma/prisma.service';
export declare class JekoService {
    private readonly prisma;
    private readonly logger;
    private readonly apiKey;
    private readonly apiKeyId;
    private readonly storeId;
    private readonly frontendUrl;
    constructor(prisma: PrismaService);
    isConfigured(): boolean;
    private headers;
    createPaymentRequest(params: {
        amountFcfa: number;
        memberId: string;
        contributionId: string;
        periodYear?: number;
        periodMonth?: number;
        cashBoxId?: string | null;
        paymentMethod: string;
        payerPhone?: string;
        regularizationAgreementId?: string;
        advanceMonths?: number;
    }): Promise<{
        reference: string;
        redirectUrl: string;
    }>;
    createPaymentLink(params: {
        amountFcfa: number;
        memberId: string;
        contributionId: string;
        periodYear?: number;
        periodMonth?: number;
        cashBoxId?: string | null;
        title: string;
        regularizationAgreementId?: string;
        advanceMonths?: number;
    }): Promise<{
        reference: string;
        link: string;
    }>;
    createFinePaymentRequest(params: {
        amountFcfa: number;
        memberId: string;
        fineId: string;
        paymentMethod: string;
        payerPhone?: string;
    }): Promise<{
        reference: string;
        redirectUrl: string;
    }>;
    createFinePaymentLink(params: {
        amountFcfa: number;
        memberId: string;
        fineId: string;
        title: string;
    }): Promise<{
        reference: string;
        link: string;
    }>;
    verifyAndRecord(reference: string): Promise<{
        paid: boolean;
        payment?: object;
    }>;
    recordFromWebhook(reference: string): Promise<{
        recorded: boolean;
        context?: {
            memberId: string;
            amountFcfa: number;
            periodYear: number | null;
            periodMonth: number | null;
        };
    }>;
    recordFromWebhookByLinkId(paymentLinkId: string): Promise<{
        recorded: boolean;
        context?: {
            memberId: string;
            amountFcfa: number;
            periodYear: number | null;
            periodMonth: number | null;
        };
    }>;
    private recordPaymentFromContext;
    private recordFinePaymentFromContext;
    private validateRegularizationPayment;
    private validateAdvancePayment;
    cleanExpired(): Promise<number>;
}
