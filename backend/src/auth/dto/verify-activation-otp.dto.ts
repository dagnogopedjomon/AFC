import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyActivationOtpDto {
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Le code est requis' })
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir 6 chiffres' })
  code: string;
}
