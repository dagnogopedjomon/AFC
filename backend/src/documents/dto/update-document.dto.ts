import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentCategory } from '@prisma/client';

/**
 * Modification d'un document (cahier des charges « Publications », section 5).
 * Le fichier ne se change pas ici : il a sa propre route, en multipart.
 */
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  /** Date portée par le document, pas celle du dépôt. */
  @IsOptional()
  @IsDateString()
  date?: string;
}
