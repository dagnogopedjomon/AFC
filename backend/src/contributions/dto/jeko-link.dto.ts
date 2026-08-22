import { IsString, IsNumber, IsOptional, Min, IsInt, Max } from 'class-validator';

export class JekoLinkDto {
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
  title: string;

  @IsOptional()
  @IsString()
  regularizationAgreementId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  advanceMonths?: number;
}
