import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

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
}
