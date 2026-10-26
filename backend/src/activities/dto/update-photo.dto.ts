import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Légende, visibilité et ordre d'une photo de l'album. */
export class UpdatePhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  /** Une photo masquée reste dans l'album interne mais n'est pas publiée. */
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
