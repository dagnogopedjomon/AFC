import { IsOptional, IsString, IsNumber, Min, IsDateString, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { ContributionStatus } from '@prisma/client';

export class UpdateContributionDto {
  @IsOptional()
  @IsString()
  name?: string;

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
  @IsBoolean()
  allowPartialPayment?: boolean;
}
