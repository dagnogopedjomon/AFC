import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ArticleCategory } from '@prisma/client';

/**
 * Modification d'un article (cahier des charges « Publications », section 5).
 * L'image de couverture ne se change pas ici : elle a sa propre route, en multipart.
 */
export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  /** Deux phrases affichées dans les listes ; calculé depuis le corps s'il est vide. */
  @IsOptional()
  @IsString()
  @MaxLength(400)
  excerpt?: string;

  /** Corps en HTML, assaini à l'enregistrement (section 6). */
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  contentHtml?: string;

  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  /** Signature affichée sur le site : « Le bureau », un prénom, ce que le bureau décide. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorName?: string;

  /** Date de parution, éventuellement à venir pour programmer la sortie. */
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  /** Description de l'image de couverture, pour les lecteurs d'écran. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  coverAlt?: string;
}
