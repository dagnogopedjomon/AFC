import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ContributionType, ContributionStatus, PaymentFrequency } from '@prisma/client';

export class CreateContributionDto {
  @IsNotEmpty({ message: 'Le nom est requis' })
  @IsString()
  name: string;

  @IsEnum(ContributionType, { message: 'Type de cotisation invalide' })
  type: ContributionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  isOpenAmount?: boolean;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetMemberIds?: string[];

  @IsOptional()
  @IsString()
  beneficiaryMemberId?: string;

  @IsOptional()
  @IsEnum(ContributionStatus)
  status?: ContributionStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetAmount?: number;

  @IsOptional()
  @IsEnum(PaymentFrequency)
  frequency?: PaymentFrequency;
}
