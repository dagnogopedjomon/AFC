import { IsString, IsNumber, IsOptional, Min, IsIn } from 'class-validator';

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
}
