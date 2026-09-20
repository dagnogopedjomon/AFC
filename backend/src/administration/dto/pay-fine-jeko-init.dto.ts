import { IsIn, IsOptional, IsString } from 'class-validator';

export class PayFineJekoInitDto {
  @IsString()
  @IsIn(['wave', 'orange', 'mtn', 'moov', 'djamo'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  payerPhone?: string;
}
