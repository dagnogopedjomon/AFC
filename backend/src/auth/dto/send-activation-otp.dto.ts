import { IsNotEmpty, IsString } from 'class-validator';

export class SendActivationOtpDto {
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @IsString()
  phone: string;
}
