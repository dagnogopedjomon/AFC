import { IsOptional, IsString, IsInt, IsBoolean, Min } from 'class-validator';

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
}
