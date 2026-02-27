import { ContributionType, PaymentFrequency } from '@prisma/client';
export declare class CreateContributionDto {
    name: string;
    type: ContributionType;
    amount?: number;
    startDate?: string;
    endDate?: string;
    targetAmount?: number;
    frequency?: PaymentFrequency;
}
