import { CashBoxTransferType } from '@prisma/client';
export declare class CreateTransferDto {
    type: CashBoxTransferType;
    cashBoxId: string;
    amount: number;
    description?: string;
}
