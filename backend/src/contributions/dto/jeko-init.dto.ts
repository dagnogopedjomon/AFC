import { IsString, IsNumber, IsOptional, Min, IsIn, IsInt, Max } from 'class-validator';

export class JekoInitDto {
  @IsString()
  contributionId: string;

  @IsNumber()
  @Min(100)
  amount: number; // FCFA (minimum Jeko = 100 FCFA = 10 000 centimes)

  @IsOptional()
  @IsNumber()
  periodYear?: number;

  @IsOptional()
  @IsNumber()
  periodMonth?: number;

  @IsString()
  @IsIn(['wave', 'orange', 'mtn', 'moov', 'djamo'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  payerPhone?: string;

  @IsOptional()
  @IsString()
  regularizationAgreementId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  advanceMonths?: number;
}
