import { Role } from '@prisma/client';
export declare class UpdateMemberDto {
    password?: string;
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    email?: string;
    neighborhood?: string;
    secondaryContact?: string;
    profileCompleted?: boolean;
    isSuspended?: boolean;
    role?: Role;
}
