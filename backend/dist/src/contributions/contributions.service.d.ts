import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { MembersService } from '../members/members.service';
export declare class ContributionsService {
    private readonly prisma;
    private readonly membersService;
    constructor(prisma: PrismaService, membersService: MembersService);
    create(dto: CreateContributionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: Prisma.Decimal | null;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: Prisma.Decimal | null;
        receivedAmount: Prisma.Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
    }>;
    update(id: string, dto: UpdateContributionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: Prisma.Decimal | null;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: Prisma.Decimal | null;
        receivedAmount: Prisma.Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
    }>;
    findAll(): Promise<({
        _count: {
            payments: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: Prisma.Decimal | null;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: Prisma.Decimal | null;
        receivedAmount: Prisma.Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
    })[]>;
    findOne(id: string): Promise<{
        payments: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: Prisma.Decimal | null;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: Prisma.Decimal | null;
        receivedAmount: Prisma.Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
    }>;
    findMonthlyContribution(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: Prisma.Decimal | null;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: Prisma.Decimal | null;
        receivedAmount: Prisma.Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
    }>;
    recordPayment(dto: RecordPaymentDto): Promise<{
        member: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            passwordHash: string | null;
            otpCode: string | null;
            otpExpiresAt: Date | null;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            profilePhotoUrl: string | null;
            email: string | null;
            neighborhood: string | null;
            secondaryContact: string | null;
            profileCompleted: boolean;
            isSuspended: boolean;
            reactivatedAt: Date | null;
            lastSeenActivitiesAt: Date | null;
        };
        contribution: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: import("@prisma/client").$Enums.ContributionType;
            amount: Prisma.Decimal | null;
            startDate: Date | null;
            endDate: Date | null;
            targetAmount: Prisma.Decimal | null;
            receivedAmount: Prisma.Decimal | null;
            frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
        };
        cashBox: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            order: number;
            isDefault: boolean;
        } | null;
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
    }>;
    getMembersInArrears(periodYear: number, periodMonth: number): Promise<{
        periodYear: number;
        periodMonth: number;
        members: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            isSuspended: boolean;
        }[];
        total: number;
    }>;
    applySuspensions(): Promise<{
        applied: number;
        message: string;
        periodYear?: undefined;
        periodMonth?: undefined;
    } | {
        applied: number;
        periodYear: number;
        periodMonth: number;
        message?: undefined;
    }>;
    reapplySuspensionsAfterReactivationDeadline(): Promise<{
        applied: number;
    }>;
    getPayments(filters: {
        memberId?: string;
        contributionId?: string;
        periodYear?: number;
        periodMonth?: number;
        limit?: number;
    }): Promise<({
        member: {
            id: string;
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
            startDate: Date | null;
            endDate: Date | null;
            targetAmount: Prisma.Decimal | null;
            receivedAmount: Prisma.Decimal | null;
            frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
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
    })[]>;
    getHistorySummary(year?: number, month?: number): Promise<{
        totalCollected: number;
        byMonth: never[];
        monthlyContributionId: null;
    } | {
        totalCollected: number;
        byMonth: {
            year: number;
            month: number;
            totalCollected: number;
            paymentsCount: number;
        }[];
        monthlyContributionId: string;
    }>;
    getMemberHistory(memberId: string): Promise<{
        member: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            isSuspended: boolean;
        };
        payments: ({
            contribution: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                type: import("@prisma/client").$Enums.ContributionType;
                amount: Prisma.Decimal | null;
                startDate: Date | null;
                endDate: Date | null;
                targetAmount: Prisma.Decimal | null;
                receivedAmount: Prisma.Decimal | null;
                frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
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
        })[];
        byMonth: {
            year: number;
            month: number;
            amount: number;
            paidAt: Date;
        }[];
        totalPaid: number;
    }>;
    getMyUnpaidMonths(memberId: string): Promise<{
        unpaidMonths: never[];
        monthlyContributionId: null;
    } | {
        unpaidMonths: {
            year: number;
            month: number;
        }[];
        monthlyContributionId: string;
    }>;
}
