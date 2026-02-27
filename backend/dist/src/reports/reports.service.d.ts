import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMonthlyReport(year: number, month: number): Promise<{
        period: {
            year: number;
            month: number;
            label: string;
        };
        totalEntries: number;
        totalExits: number;
        solde: number;
        payments: ({
            member: {
                phone: string;
                firstName: string;
                lastName: string;
            };
            contribution: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                type: import("@prisma/client").$Enums.ContributionType;
                amount: import("@prisma/client-runtime-utils").Decimal | null;
                startDate: Date | null;
                endDate: Date | null;
                targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
                receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
                frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
            };
        } & {
            id: string;
            createdAt: Date;
            memberId: string;
            amount: import("@prisma/client-runtime-utils").Decimal;
            contributionId: string;
            paidAt: Date;
            cashBoxId: string | null;
            periodYear: number | null;
            periodMonth: number | null;
            metadata: string | null;
        })[];
        expenses: ({
            requestedBy: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@prisma/client-runtime-utils").Decimal;
            cashBoxId: string | null;
            description: string;
            status: import("@prisma/client").$Enums.ExpenseStatus;
            expenseDate: Date;
            beneficiary: string | null;
            requestedById: string;
            treasurerApprovedById: string | null;
            treasurerApprovedAt: Date | null;
            commissionerApprovedById: string | null;
            commissionerApprovedAt: Date | null;
            rejectReason: string | null;
        })[];
    }>;
    getAnnualReport(year: number): Promise<{
        year: number;
        months: {
            year: number;
            month: number;
            label: string;
            totalEntries: number;
            totalExits: number;
            solde: number;
        }[];
        totalEntries: number;
        totalExits: number;
        solde: number;
    }>;
    getTransactions(year?: number, month?: number): Promise<{
        payments: {
            type: string;
            date: Date;
            description: string;
            member: string;
            amount: number;
        }[];
        expenses: {
            type: string;
            date: Date;
            description: string;
            member: string;
            amount: number;
        }[];
    }>;
    getTransactionsPdfBuffer(year?: number, month?: number): Promise<Buffer>;
}
