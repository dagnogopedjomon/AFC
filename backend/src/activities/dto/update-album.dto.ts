import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Réglages de l'album d'un événement. */
export class UpdateAlbumDto {
  /** L'album n'est repris sur le site que si le bureau l'autorise. */
  @IsOptional()
  @IsBoolean()
  albumVisible?: boolean;

  /** Identifiant de la photo de couverture (null pour en retirer une). */
  @IsOptional()
  @IsString()
  coverPhotoId?: string | null;
}
