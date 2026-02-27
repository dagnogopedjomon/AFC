import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';

export class CompleteProfileDto {
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'Le nom est requis' })
  @IsString()
  lastName: string;

  @IsNotEmpty({ message: 'La photo de profil est requise' })
  @IsString()
  profilePhotoUrl: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  secondaryContact?: string;
}
