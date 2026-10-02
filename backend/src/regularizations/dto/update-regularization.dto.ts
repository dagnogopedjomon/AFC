import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRegularizationDto {
  @IsOptional()
  @IsNumber()
  @Min(100)
  agreedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  initialAmount?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
