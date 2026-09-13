import { IsOptional, IsString, IsInt, IsBoolean, IsNumber, Min } from 'class-validator';

export class UpdateCashBoxDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;
}
