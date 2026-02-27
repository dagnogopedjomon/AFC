import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CashBoxTransferType } from '@prisma/client';

export class CreateTransferDto {
  @IsEnum(CashBoxTransferType, { message: 'Type invalide (ALLOCATION ou WITHDRAWAL)' })
  type: CashBoxTransferType;

  /** Sous-caisse concernée : pour ALLOCATION = caisse créditée, pour WITHDRAWAL = caisse débitée */
  @IsString()
  cashBoxId: string;

  @IsNumber()
  @Min(0.01, { message: 'Le montant doit être strictement positif' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
