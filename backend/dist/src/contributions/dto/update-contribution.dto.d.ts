import { ContributionStatus } from '@prisma/client';
export declare class UpdateContributionDto {
    name?: string;
    amount?: number;
    isOpenAmount?: boolean;
    deadline?: string;
    targetMemberIds?: string[];
    beneficiaryMemberId?: string;
    status?: ContributionStatus;
    startDate?: string;
    endDate?: string;
    allowPartialPayment?: boolean;
}
