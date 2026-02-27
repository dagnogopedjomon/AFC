import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class MembersController {
    private readonly membersService;
    constructor(membersService: MembersService);
    invite(dto: InviteMemberDto, user: RequestUser): Promise<{
        activationLink: string;
        whatsappSent: boolean | undefined;
        whatsappError: string | undefined;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        reactivatedAt: Date | null;
    }>;
    create(dto: CreateMemberDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        reactivatedAt: Date | null;
    }>;
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        reactivatedAt: Date | null;
    }[]>;
    getMe(user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        reactivatedAt: Date | null;
    }>;
    completeProfile(user: RequestUser, dto: CompleteProfileDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        reactivatedAt: Date | null;
    }>;
    uploadAvatar(user: RequestUser, file: Express.Multer.File | undefined): {
        url: string;
    };
    getAuditLog(id: string): Promise<({
        performedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        memberId: string;
        action: string;
        details: string | null;
        performedById: string | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        reactivatedAt: Date | null;
    }>;
    update(id: string, dto: UpdateMemberDto, user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        reactivatedAt: Date | null;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
