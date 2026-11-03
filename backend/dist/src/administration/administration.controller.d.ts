import { FineStatus } from '@prisma/client';
import type { RequestUser } from '../auth/jwt.strategy';
import { AdministrationService } from './administration.service';
import { JekoService } from '../contributions/jeko.service';
import { PayFineJekoInitDto } from './dto/pay-fine-jeko-init.dto';
import { PayFineJekoLinkDto } from './dto/pay-fine-jeko-link.dto';
export declare class AdministrationController {
    private readonly service;
    private readonly jekoService;
    constructor(service: AdministrationService, jekoService: JekoService);
    categories(all?: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
    }[]>;
    createCategory(body: {
        name: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
    }>;
    updateCategory(id: string, body: {
        name?: string;
        isActive?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
    }>;
    fines(memberId?: string, status?: FineStatus, reason?: string): import("@prisma/client").Prisma.PrismaPromise<({
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
    myFines(user: RequestUser): import("@prisma/client").Prisma.PrismaPromise<({
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
    createFine(body: {
        memberId: string;
        reason: string;
        amount: number;
        note?: string;
    }, user: RequestUser): Promise<{
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
    payFineJekoInit(id: string, dto: PayFineJekoInitDto, user: RequestUser): Promise<{
        reference: string;
        redirectUrl: string;
    }>;
    payFineJekoLink(id: string, dto: PayFineJekoLinkDto, user: RequestUser): Promise<{
        reference: string;
        link: string;
    }>;
    verifyFinePayment(reference: string): Promise<{
        paid: boolean;
        payment?: object;
    }>;
    exemptions(memberId?: string, year?: string): import("@prisma/client").Prisma.PrismaPromise<({
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
    createExemption(body: {
        memberId: string;
        periodYear: number;
        periodMonth: number;
        reason?: string;
    }, user: RequestUser): Promise<{
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
