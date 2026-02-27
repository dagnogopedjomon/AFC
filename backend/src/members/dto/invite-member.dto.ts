import { IsNotEmpty, IsString } from 'class-validator';

export class InviteMemberDto {
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @IsString()
  phone: string;
}
