import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PublicationStatus } from '@prisma/client';

/** Publier, retirer ou archiver un événement sur le site public. */
export class PublishActivityDto {
  @IsEnum(PublicationStatus)
  status: PublicationStatus;

  /** Lieu affiché sur le site, facultatif (« Terrain de five, Cocody »). */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;
}
