import { PrismaService } from '../prisma/prisma.service';
import { ContributionsService } from '../contributions/contributions.service';
import { MembersService } from '../members/members.service';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { UpdateRegularizationDto } from './dto/update-regularization.dto';
export declare class RegularizationsService {
    private readonly prisma;
    private readonly contributions;
    private readonly members;
    constructor(prisma: PrismaService, contributions: ContributionsService, members: MembersService);
    private serialize;
    create(dto: CreateRegularizationDto, createdById: string): Promise<any>;
    list(): Promise<any[]>;
    listCandidates(): Promise<{
        debt: {
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
        };
        eligibleForAgreement: boolean;
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        isSuspended: boolean;
    }[]>;
    forMember(memberId: string): Promise<any[]>;
    myActive(memberId: string): Promise<any>;
    update(id: string, dto: UpdateRegularizationDto, performedById: string): Promise<any>;
    cancel(id: string, performedById: string): Promise<any>;
    reapplyOverdueSuspensions(): Promise<{
        applied: number;
    }>;
}
