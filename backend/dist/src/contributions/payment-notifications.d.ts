import { PrismaService } from '../prisma/prisma.service';
type Period = {
    year: number;
    month: number;
};
export declare function describePeriods(periods: Period[]): string;
export declare function notifyPaymentValidated(prisma: PrismaService, params: {
    memberId: string;
    amountFcfa: number;
    periods?: Period[];
    label?: string;
    excludeAdminId?: string;
}): Promise<void>;
export {};
