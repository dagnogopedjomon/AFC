import { IsNotEmpty, IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateCashBoxDto {
  @IsNotEmpty({ message: 'Le nom est requis' })
  @IsString()
  name: string;

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
