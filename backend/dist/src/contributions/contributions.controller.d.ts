import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { SelfPaymentDto } from './dto/self-payment.dto';
import { JekoInitDto } from './dto/jeko-init.dto';
import { JekoLinkDto } from './dto/jeko-link.dto';
import { AllocateContributionDto } from './dto/allocate-contribution.dto';
import { RecordAdvancePaymentDto } from './dto/record-advance-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { JekoService } from './jeko.service';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class ContributionsController {
    private readonly contributionsService;
    private readonly jekoService;
    constructor(contributionsService: ContributionsService, jekoService: JekoService);
    create(dto: CreateContributionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        isOpenAmount: boolean;
        deadline: Date | null;
        targetMemberIds: string | null;
        beneficiaryMemberId: string | null;
        status: import("@prisma/client").$Enums.ContributionStatus;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
        receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
        allowPartialPayment: boolean;
    }>;
    update(id: string, dto: UpdateContributionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        isOpenAmount: boolean;
        deadline: Date | null;
        targetMemberIds: string | null;
        beneficiaryMemberId: string | null;
        status: import("@prisma/client").$Enums.ContributionStatus;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
        receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
        allowPartialPayment: boolean;
    }>;
    findAll(req: {
        user: RequestUser;
    }): Promise<({
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
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        isOpenAmount: boolean;
        deadline: Date | null;
        targetMemberIds: string | null;
        beneficiaryMemberId: string | null;
        status: import("@prisma/client").$Enums.ContributionStatus;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
        receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
        allowPartialPayment: boolean;
    })[]>;
    findExceptional(req: {
        user: RequestUser;
    }): Promise<({
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
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        isOpenAmount: boolean;
        deadline: Date | null;
        targetMemberIds: string | null;
        beneficiaryMemberId: string | null;
        status: import("@prisma/client").$Enums.ContributionStatus;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
        receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
        allowPartialPayment: boolean;
    })[]>;
    getMonthly(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        isOpenAmount: boolean;
        deadline: Date | null;
        targetMemberIds: string | null;
        beneficiaryMemberId: string | null;
        status: import("@prisma/client").$Enums.ContributionStatus;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
        receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
        allowPartialPayment: boolean;
    }>;
    getContributors(id: string): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
            contributionId: string;
            description: string | null;
            performedById: string | null;
            fromCashBoxId: string | null;
        })[];
        totalFromMembers: number;
        totalFromCashBox: number;
        total: number;
    }>;
    allocate(req: {
        user: RequestUser;
    }, id: string, dto: AllocateContributionDto): Promise<{
        id: string;
        createdAt: Date;
        amount: import("@prisma/client-runtime-utils").Decimal;
        contributionId: string;
        description: string | null;
        performedById: string | null;
        fromCashBoxId: string | null;
    }>;
    close(req: {
        user: RequestUser;
    }, id: string, body: {
        status: 'CLOSED_PENDING' | 'CLOSED_DELIVERED';
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import("@prisma/client").$Enums.ContributionType;
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        isOpenAmount: boolean;
        deadline: Date | null;
        targetMemberIds: string | null;
        beneficiaryMemberId: string | null;
        status: import("@prisma/client").$Enums.ContributionStatus;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
        receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
        allowPartialPayment: boolean;
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
    getAnnualMatrix(year?: string): Promise<{
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
    jekoInit(req: {
        user: RequestUser;
    }, dto: JekoInitDto): Promise<{
        reference: string;
        redirectUrl: string;
    }>;
    jekoLink(req: {
        user: RequestUser;
    }, dto: JekoLinkDto): Promise<{
        reference: string;
        link: string;
    }>;
    jekoVerify(reference: string): Promise<{
        paid: boolean;
        payment?: object;
    }>;
    recordPaymentForSelf(req: {
        user: RequestUser;
    }, dto: SelfPaymentDto): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal | null;
            isOpenAmount: boolean;
            deadline: Date | null;
            targetMemberIds: string | null;
            beneficiaryMemberId: string | null;
            status: import("@prisma/client").$Enums.ContributionStatus;
            startDate: Date | null;
            endDate: Date | null;
            targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
            receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
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
            openingBalance: import("@prisma/client-runtime-utils").Decimal;
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
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancellationReason: string | null;
        regularizationAgreementId: string | null;
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
            amount: import("@prisma/client-runtime-utils").Decimal | null;
            isOpenAmount: boolean;
            deadline: Date | null;
            targetMemberIds: string | null;
            beneficiaryMemberId: string | null;
            status: import("@prisma/client").$Enums.ContributionStatus;
            startDate: Date | null;
            endDate: Date | null;
            targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
            receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
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
            openingBalance: import("@prisma/client-runtime-utils").Decimal;
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
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancellationReason: string | null;
        regularizationAgreementId: string | null;
    }>;
    previewAdvance(memberId: string, months: string): Promise<{
        year: number;
        month: number;
    }[]>;
    recordExternalAdvance(dto: RecordAdvancePaymentDto, req: {
        user: RequestUser;
    }): Promise<{
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
    cancelPayment(id: string, dto: CancelPaymentDto, req: {
        user: RequestUser;
    }): Promise<{
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
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancellationReason: string | null;
        regularizationAgreementId: string | null;
    }>;
    getMyPrepayment(req: {
        user: RequestUser;
    }): Promise<{
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
    getPayments(req: {
        user: RequestUser;
    }, memberId?: string, contributionId?: string, year?: string, month?: string, limit?: string): Promise<({
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
            isOpenAmount: boolean;
            deadline: Date | null;
            targetMemberIds: string | null;
            beneficiaryMemberId: string | null;
            status: import("@prisma/client").$Enums.ContributionStatus;
            startDate: Date | null;
            endDate: Date | null;
            targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
            receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
            frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
            allowPartialPayment: boolean;
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
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancellationReason: string | null;
        regularizationAgreementId: string | null;
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
    getMemberHistory(memberId: string, req: {
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
                isOpenAmount: boolean;
                deadline: Date | null;
                targetMemberIds: string | null;
                beneficiaryMemberId: string | null;
                status: import("@prisma/client").$Enums.ContributionStatus;
                startDate: Date | null;
                endDate: Date | null;
                targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
                receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
                frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
                allowPartialPayment: boolean;
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
                isOpenAmount: boolean;
                deadline: Date | null;
                targetMemberIds: string | null;
                beneficiaryMemberId: string | null;
                status: import("@prisma/client").$Enums.ContributionStatus;
                startDate: Date | null;
                endDate: Date | null;
                targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
                receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
                frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
                allowPartialPayment: boolean;
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
    getMyDebtSummary(req: {
        user: RequestUser;
    }): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        isOpenAmount: boolean;
        deadline: Date | null;
        targetMemberIds: string | null;
        beneficiaryMemberId: string | null;
        status: import("@prisma/client").$Enums.ContributionStatus;
        startDate: Date | null;
        endDate: Date | null;
        targetAmount: import("@prisma/client-runtime-utils").Decimal | null;
        receivedAmount: import("@prisma/client-runtime-utils").Decimal | null;
        frequency: import("@prisma/client").$Enums.PaymentFrequency | null;
        allowPartialPayment: boolean;
    }>;
}
