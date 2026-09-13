import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'L’identifiant est requis' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @IsNotEmpty({ message: 'L’appareil est requis' })
  @IsString()
  deviceId: string;
}
