import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsInt,
  Max,
} from 'class-validator';

export class SelfPaymentDto {
  @IsNotEmpty({ message: 'La cotisation est requise' })
  @IsString()
  contributionId: string;

  @IsNumber()
  @Min(0.01, { message: 'Le montant doit être strictement positif' })
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;
}
