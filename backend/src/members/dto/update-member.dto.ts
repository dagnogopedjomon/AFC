import { IsString, IsOptional, MinLength, IsEmail, IsBoolean, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

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

  @IsOptional()
  @IsBoolean()
  profileCompleted?: boolean;

  /** Seul l’Admin peut réactiver un compte suspendu (isSuspended: false). */
  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;

  /** Rôle (attribué après élections). Seul l'Admin peut modifier. */
  @IsOptional()
  @IsEnum(Role, { message: 'Rôle invalide' })
  role?: Role;
}
