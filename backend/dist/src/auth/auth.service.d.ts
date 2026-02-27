import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '@prisma/client';
export type JwtPayload = {
    sub: string;
    phone: string;
    role: Role;
};
export type ActivationPayload = {
    sub: string;
    purpose: 'activation';
};
export interface AuthResult {
    access_token: string;
    user: {
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        role: Role;
        profileCompleted: boolean;
        profilePhotoUrl: string | null;
        email: string | null;
        isSuspended: boolean;
    };
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly notifications;
    constructor(prisma: PrismaService, jwtService: JwtService, notifications: NotificationsService);
    validateUser(phone: string, password: string): Promise<{
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
    } | null>;
    login(phone: string, password: string): Promise<AuthResult>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        phone: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        profilePhotoUrl: string | null;
        email: string | null;
        neighborhood: string | null;
        secondaryContact: string | null;
        profileCompleted: boolean;
        isSuspended: boolean;
    } | null>;
    sendActivationOtp(phone: string): Promise<{
        ok: boolean;
        demoCode: string;
        message: string;
    } | {
        ok: boolean;
        message: string;
        demoCode?: undefined;
    }>;
    verifyActivationOtp(phone: string, code: string): Promise<{
        activationToken: string;
    }>;
    createActivationToken(memberId: string, expiresIn?: string): string;
    setPassword(activationToken: string, password: string): Promise<{
        ok: boolean;
        message: string;
    }>;
}
