import { FineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class AdministrationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listCategories(includeInactive?: boolean): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
    }[]>;
    createCategory(name: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
    }>;
    updateCategory(id: string, data: {
        name?: string;
        isActive?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
    }>;
    listFines(filters: {
        memberId?: string;
        status?: FineStatus;
        reason?: string;
    }): import("@prisma/client").Prisma.PrismaPromise<({
        member: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
        cashBox: {
            id: string;
            name: string;
        } | null;
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        memberId: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        status: import("@prisma/client").$Enums.FineStatus;
        paidAt: Date | null;
        cashBoxId: string | null;
        cancelledAt: Date | null;
        note: string | null;
        createdById: string;
        reason: string;
    })[]>;
    createFine(data: {
        memberId: string;
        reason: string;
        amount: number;
        note?: string;
    }, createdById: string): Promise<{
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        memberId: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        status: import("@prisma/client").$Enums.FineStatus;
        paidAt: Date | null;
        cashBoxId: string | null;
        cancelledAt: Date | null;
        note: string | null;
        createdById: string;
        reason: string;
    }>;
    settleFine(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        memberId: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        status: import("@prisma/client").$Enums.FineStatus;
        paidAt: Date | null;
        cashBoxId: string | null;
        cancelledAt: Date | null;
        note: string | null;
        createdById: string;
        reason: string;
    }>;
    getFineForPayment(id: string, user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        memberId: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        status: import("@prisma/client").$Enums.FineStatus;
        paidAt: Date | null;
        cashBoxId: string | null;
        cancelledAt: Date | null;
        note: string | null;
        createdById: string;
        reason: string;
    }>;
    cancelFine(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        memberId: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        status: import("@prisma/client").$Enums.FineStatus;
        paidAt: Date | null;
        cashBoxId: string | null;
        cancelledAt: Date | null;
        note: string | null;
        createdById: string;
        reason: string;
    }>;
    listExemptions(memberId?: string, year?: number): import("@prisma/client").Prisma.PrismaPromise<({
        member: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        memberId: string;
        periodYear: number;
        periodMonth: number;
        createdById: string;
        reason: string | null;
    })[]>;
    createExemption(data: {
        memberId: string;
        periodYear: number;
        periodMonth: number;
        reason?: string;
    }, createdById: string): Promise<{
        id: string;
        createdAt: Date;
        memberId: string;
        periodYear: number;
        periodMonth: number;
        createdById: string;
        reason: string | null;
    }>;
    deleteExemption(id: string): import("@prisma/client").Prisma.Prisma__ContributionExemptionClient<{
        id: string;
        createdAt: Date;
        memberId: string;
        periodYear: number;
        periodMonth: number;
        createdById: string;
        reason: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
