import { Role } from '@prisma/client';
export declare class CreateMemberDto {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    profilePhotoUrl?: string;
    email?: string;
    neighborhood?: string;
    secondaryContact?: string;
}
