import { IsEnum } from 'class-validator';
import { PublicationStatus } from '@prisma/client';

/** Publier, retirer ou archiver un document sur le site public. */
export class PublishDocumentDto {
  @IsEnum(PublicationStatus)
  status: PublicationStatus;
}
