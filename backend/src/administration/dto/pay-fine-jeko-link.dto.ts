import { IsOptional, IsString } from 'class-validator';

export class PayFineJekoLinkDto {
  @IsOptional()
  @IsString()
  title?: string;
}
