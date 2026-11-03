import { MembersService } from './members.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class MembersController {
    private readonly membersService;
    private readonly supabase;
    constructor(membersService: MembersService, supabase: SupabaseService);
    invite(dto: InviteMemberDto, user: RequestUser): Promise<{
        activationLink: string;
        smsSent: boolean;
        smsError: string | undefined;
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        membershipStatus: import("@prisma/client").$Enums.MembershipStatus;
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
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        membershipStatus: import("@prisma/client").$Enums.MembershipStatus;
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
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        membershipStatus: import("@prisma/client").$Enums.MembershipStatus;
        profilePhotoUrl: string | null;
        email: string | null;
        neighborhood: string | null;
        secondaryContact: string | null;
        profileCompleted: boolean;
        isSuspended: boolean;
        reactivatedAt: Date | null;
    }[]>;
    count(): Promise<{
        count: number;
    }>;
    getMe(user: RequestUser): Promise<{
        id: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        membershipStatus: import("@prisma/client").$Enums.MembershipStatus;
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
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        membershipStatus: import("@prisma/client").$Enums.MembershipStatus;
        profilePhotoUrl: string | null;
        email: string | null;
        neighborhood: string | null;
        secondaryContact: string | null;
        profileCompleted: boolean;
        isSuspended: boolean;
        reactivatedAt: Date | null;
    }>;
    uploadAvatar(user: RequestUser, file: Express.Multer.File | undefined): Promise<{
        url: string;
    }>;
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
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        membershipStatus: import("@prisma/client").$Enums.MembershipStatus;
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
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        membershipStatus: import("@prisma/client").$Enums.MembershipStatus;
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
