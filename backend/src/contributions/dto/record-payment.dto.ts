import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsInt,
  Min as MinVal,
  Max,
} from 'class-validator';

export class RecordPaymentDto {
  @IsNotEmpty({ message: 'Le membre est requis' })
  @IsString()
  memberId: string;

  @IsNotEmpty({ message: 'La cotisation est requise' })
  @IsString()
  contributionId: string;

  @IsNumber()
  @Min(0.01, { message: 'Le montant doit être strictement positif' })
  amount: number;

  /** Pour cotisation mensuelle : année (ex. 2025) */
  @IsOptional()
  @IsInt()
  @MinVal(2000)
  @Max(2100)
  periodYear?: number;

  /** Pour cotisation mensuelle : mois 1-12 */
  @IsOptional()
  @IsInt()
  @MinVal(1)
  @Max(12)
  periodMonth?: number;

  /** Sous-caisse à créditer (optionnel = caisse par défaut) */
  @IsOptional()
  @IsString()
  cashBoxId?: string;
}
