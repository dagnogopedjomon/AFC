import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class JekoInitDto {
  @IsString()
  contributionId: string;

  @IsNumber()
  @Min(10000)
  amount: number; // FCFA (minimum Jeko = 10 000 XOF)

  @IsOptional()
  @IsNumber()
  periodYear?: number;

  @IsOptional()
  @IsNumber()
  periodMonth?: number;
}
