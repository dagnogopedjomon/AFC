import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PublicationStatus } from '@prisma/client';

/** Publier, programmer, retirer ou archiver un article sur le site public. */
export class PublishArticleDto {
  @IsEnum(PublicationStatus)
  status: PublicationStatus;

  /**
   * Date de parution. Absente, l'article paraît tout de suite ; dans le futur,
   * il est programmé et reste invisible du site jusque-là.
   */
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
