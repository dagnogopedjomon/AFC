import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RegularizationMode } from '@prisma/client';

export class CreateRegularizationDto {
  @IsString()
  memberId: string;

  @IsEnum(RegularizationMode)
  mode: RegularizationMode;

  @IsNumber()
  @Min(100)
  agreedAmount: number;

  @IsNumber()
  @Min(100)
  initialAmount: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
