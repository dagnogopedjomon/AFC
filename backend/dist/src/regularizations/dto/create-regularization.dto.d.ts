import { RegularizationMode } from '@prisma/client';
export declare class CreateRegularizationDto {
    memberId: string;
    mode: RegularizationMode;
    agreedAmount: number;
    initialAmount: number;
    deadline?: string;
    notes?: string;
}
