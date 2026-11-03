import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { MembersService } from '../members/members.service';
import { RecordAdvancePaymentDto } from './dto/record-advance-payment.dto';
export declare class ContributionsService {
    private readonly prisma;
    private readonly membersService;
    constructor(prisma: PrismaService, membersService: MembersService);
    private getNextUnpaidPeriods;
    previewAdvancePeriods(memberId: string, months: number): Promise<{
        year: number;
        month: number;
    }[]>;
    private assertNoActiveAgreement;
    private notifyContributionMembers;
    create(dto: CreateContributionDto): Promise<{
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
    }>;
    private createRecord;
    update(id: string, dto: UpdateContributionDto): Promise<{
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
    }>;
    findAll(memberId?: string): Promise<({
        _count: {
            payments: number;
        };
        beneficiary: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
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
            cancelledAt: Date | null;
            cancelledById: string | null;
            cancellationReason: string | null;
            regularizationAgreementId: string | null;
        }[];
    } & {
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
    }>;
    findMonthlyContribution(): Promise<{
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
    }>;
    recordPayment(dto: RecordPaymentDto): Promise<{
        member: {
            id: string;
            phone: string;
            createdAt: Date;
            updatedAt: Date;
            passwordHash: string | null;
            activeDeviceId: string | null;
            otpCode: string | null;
            otpExpiresAt: Date | null;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            membershipStatus: import("@prisma/client").$Enums.MembershipStatus;
            membershipStatusManual: boolean;
            profilePhotoUrl: string | null;
            email: string | null;
            neighborhood: string | null;
            secondaryContact: string | null;
            profileCompleted: boolean;
            isSuspended: boolean;
            reactivatedAt: Date | null;
            lastSeenActivitiesAt: Date | null;
            sitePublicConsent: boolean;
            sitePublicConsentAt: Date | null;
            sitePublicOrder: number | null;
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
        cashBox: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            order: number;
            isDefault: boolean;
            openingBalance: Prisma.Decimal;
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
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancellationReason: string | null;
        regularizationAgreementId: string | null;
    }>;
    recordExternalAdvancePayment(dto: RecordAdvancePaymentDto, performedById: string): Promise<{
        periods: {
            year: number;
            month: number;
        }[];
        batchReference: string;
        totalAmount: number;
        paidThrough: {
            year: number;
            month: number;
        } | undefined;
    }>;
    cancelPayment(paymentId: string, reason: string, performedById: string): Promise<{
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
    }>;
    getPrepaymentStatus(memberId: string): Promise<{
        paidThrough: {
            year: number;
            month: number;
        } | null;
        futureMonthsPaid: number;
        periods: {
            year: number;
            month: number;
        }[];
    }>;
    getAnnualMatrix(year: number): Promise<{
        year: number;
        monthlyAmount: number;
        contributionId: string;
        members: {
            months: {
                month: number;
                status: "PAID" | "PARTIAL" | "LATE" | "ADVANCE" | "INACTIVE" | "NOT_DUE" | "EXEMPT";
                amountPaid: number;
                paidAt: Date | null;
            }[];
            id: string;
            phone: string;
            createdAt: Date;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            profilePhotoUrl: string | null;
            isSuspended: boolean;
        }[];
    }>;
    findActiveMonthlyCotisation(): Promise<{
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
    } | null>;
    findUnpaidMembersForMonth(year: number, month: number, contributionId: string): Promise<{
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        email: string | null;
    }[]>;
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
    getMyDebtSummary(memberId: string): Promise<{
        totalOwed: number;
        monthlyAmount: number;
        unpaidMonths: never[];
        monthlyContributionId: null;
    } | {
        totalOwed: number;
        monthlyAmount: number;
        unpaidMonths: {
            year: number;
            month: number;
            amount: number;
            label: string;
        }[];
        monthlyContributionId: string;
    }>;
    allocateFunds(dto: {
        contributionId: string;
        amount: number;
        fromCashBoxId?: string;
        description?: string;
        performedById?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        contributionId: string;
        description: string | null;
        performedById: string | null;
        fromCashBoxId: string | null;
    }>;
    getContributors(contributionId: string): Promise<{
        payments: {
            id: string;
            memberId: string;
            firstName: string;
            lastName: string;
            profilePhotoUrl: string | null;
            amount: number;
            paidAt: Date;
        }[];
        allocations: ({
            performedBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            fromCashBox: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            amount: Prisma.Decimal;
            contributionId: string;
            description: string | null;
            performedById: string | null;
            fromCashBoxId: string | null;
        })[];
        totalFromMembers: number;
        totalFromCashBox: number;
        total: number;
    }>;
    closeContribution(id: string, status: 'CLOSED_PENDING' | 'CLOSED_DELIVERED', performedById?: string): Promise<{
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
    }>;
}
