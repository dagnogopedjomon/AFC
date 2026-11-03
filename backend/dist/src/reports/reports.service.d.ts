import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
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
        advanceEntries: number;
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
                amount: Prisma.Decimal | null;
                isOpenAmount: boolean;
                deadline: Date | null;
                targetMemberIds: string | null;
                beneficiaryMemberId: string | null;
                status: import("@prisma/client").$Enums.ContributionStatus;
                startDate: Date | null;
                endDate: Date | null;
                targetAmount: Prisma.Decimal | null;
                receivedAmount: Prisma.Decimal | null;
                frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
                allowPartialPayment: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            memberId: string;
            amount: Prisma.Decimal;
            contributionId: string;
            paidAt: Date;
            cashBoxId: string | null;
            periodYear: number | null;
            periodMonth: number | null;
            metadata: string | null;
            cancelledAt: Date | null;
            cancelledById: string | null;
            cancellationReason: string | null;
            regularizationAgreementId: string | null;
        })[];
        fines: ({
            member: {
                phone: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            memberId: string;
            amount: Prisma.Decimal;
            status: import("@prisma/client").$Enums.FineStatus;
            paidAt: Date | null;
            cashBoxId: string | null;
            cancelledAt: Date | null;
            note: string | null;
            createdById: string;
            reason: string;
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
            amount: Prisma.Decimal;
            status: import("@prisma/client").$Enums.ExpenseStatus;
            beneficiary: string | null;
            cashBoxId: string | null;
            description: string;
            expenseDate: Date;
            note: string | null;
            treasurerApprovedAt: Date | null;
            commissionerApprovedAt: Date | null;
            rejectReason: string | null;
            categoryId: string | null;
            requestedById: string;
            treasurerApprovedById: string | null;
            commissionerApprovedById: string | null;
        })[];
    }>;
    getAnnualReport(year: number): Promise<{
        year: number;
        months: {
            year: number;
            month: number;
            label: string;
            totalEntries: number;
            advanceEntries: number;
            totalExits: number;
            solde: number;
        }[];
        futureAllocations: {
            label: string;
            year: number;
            month: number;
            totalEntries: number;
        }[];
        allocatedEntries: number;
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
    getTransactionsExcelBuffer(year?: number, month?: number): Promise<Buffer>;
}
