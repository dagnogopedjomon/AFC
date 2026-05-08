import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class JekoInitDto {
  @IsString()
  contributionId: string;

  @IsNumber()
  @Min(100)
  amount: number; // FCFA

  @IsOptional()
  @IsNumber()
  periodYear?: number;

  @IsOptional()
  @IsNumber()
  periodMonth?: number;
}
