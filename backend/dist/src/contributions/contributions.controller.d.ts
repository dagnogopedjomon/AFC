import { ContributionsService } from './contributions.service';
import { CinetpayService } from './cinetpay.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { SelfPaymentDto } from './dto/self-payment.dto';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class ContributionsController {
    private readonly contributionsService;
    private readonly cinetpayService;
    constructor(contributionsService: ContributionsService, cinetpayService: CinetpayService);
    create(dto: CreateContributionDto): Promise<{
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
    }>;
    update(id: string, dto: UpdateContributionDto): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
        receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
    })[]>;
    getMonthly(): Promise<{
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
    }>;
    getArrears(year?: string, month?: string): Promise<{
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
    recordPaymentForSelf(req: {
        user: RequestUser;
    }, dto: SelfPaymentDto): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal | null;
            startDate: Date | null;
            endDate: Date | null;
            targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
            receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
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
        amount: import("@prisma/client-runtime-utils").Decimal;
        contributionId: string;
        paidAt: Date;
        cashBoxId: string | null;
        periodYear: number | null;
        periodMonth: number | null;
        metadata: string | null;
    }>;
    cinetpayInit(req: {
        user: RequestUser;
    }, dto: SelfPaymentDto): Promise<{
        paymentUrl: string;
        transactionId: string;
    }>;
    cinetpayVerify(req: {
        user: RequestUser;
    }, transactionId: string): Promise<{
        status: string;
        completed: boolean;
        remainingUnpaidMonths: {
            year: number;
            month: number;
        }[];
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
            amount: import("@prisma/client-runtime-utils").Decimal | null;
            startDate: Date | null;
            endDate: Date | null;
            targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
            receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
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
        amount: import("@prisma/client-runtime-utils").Decimal;
        contributionId: string;
        paidAt: Date;
        cashBoxId: string | null;
        periodYear: number | null;
        periodMonth: number | null;
        metadata: string | null;
    }>;
    getPayments(memberId?: string, contributionId?: string, year?: string, month?: string, limit?: string): Promise<({
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
    })[]>;
    getHistorySummary(year?: string, month?: string): Promise<{
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
        byMonth: {
            year: number;
            month: number;
            amount: number;
            paidAt: Date;
        }[];
        totalPaid: number;
    }>;
    getMyStatus(req: {
        user: RequestUser;
    }): Promise<{
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
        byMonth: {
            year: number;
            month: number;
            amount: number;
            paidAt: Date;
        }[];
        totalPaid: number;
    }>;
    getMyUnpaidMonths(req: {
        user: RequestUser;
    }): Promise<{
        unpaidMonths: never[];
        monthlyContributionId: null;
    } | {
        unpaidMonths: {
            year: number;
            month: number;
        }[];
        monthlyContributionId: string;
    }>;
    findOne(id: string): Promise<{
        payments: {
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
        }[];
    } & {
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
    }>;
}
