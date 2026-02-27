import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsEmail,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateMemberDto {
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @IsNotEmpty({ message: 'Le prénom est requis' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'Le nom est requis' })
  @IsString()
  lastName: string;

  @IsEnum(Role, { message: 'Rôle invalide' })
  role: Role;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

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
