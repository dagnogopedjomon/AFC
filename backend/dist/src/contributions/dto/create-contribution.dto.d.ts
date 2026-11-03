import { ContributionType, ContributionStatus, PaymentFrequency } from '@prisma/client';
export declare class CreateContributionDto {
    name: string;
    type: ContributionType;
    amount?: number;
    isOpenAmount?: boolean;
    deadline?: string;
    targetMemberIds?: string[];
    beneficiaryMemberId?: string;
    status?: ContributionStatus;
    startDate?: string;
    endDate?: string;
    targetAmount?: number;
    frequency?: PaymentFrequency;
    allowPartialPayment?: boolean;
}
