import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class AllocateContributionDto {
  @IsNotEmpty({ message: 'La cotisation est requise' })
  @IsString()
  contributionId: string;

  @IsNotEmpty({ message: 'Le montant est requis' })
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  fromCashBoxId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
