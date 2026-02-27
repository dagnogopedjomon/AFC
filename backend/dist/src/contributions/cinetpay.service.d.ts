import { PrismaService } from '../prisma/prisma.service';
import { ContributionsService } from './contributions.service';
export declare class CinetpayService {
    private readonly prisma;
    private readonly contributionsService;
    private readonly logger;
    private readonly apikey;
    private readonly siteId;
    private readonly notifyUrl;
    private readonly returnUrl;
    private readonly currency;
    constructor(prisma: PrismaService, contributionsService: ContributionsService);
    isConfigured(): boolean;
    initPayment(memberId: string, body: {
        contributionId: string;
        amount: number;
        periodYear?: number;
        periodMonth?: number;
    }): Promise<{
        paymentUrl: string;
        transactionId: string;
    }>;
    verifyWithCinetPay(transactionId: string): Promise<{
        status: string;
        amount?: number;
    } | null>;
    completePayment(transactionId: string): Promise<void>;
    handleNotify(body: Record<string, unknown>): Promise<void>;
    verifyAndComplete(transactionId: string, memberId: string): Promise<{
        status: string;
        completed: boolean;
        remainingUnpaidMonths: {
            year: number;
            month: number;
        }[];
    }>;
}
