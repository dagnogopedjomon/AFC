import { IsString, MinLength } from 'class-validator';

export class CancelPaymentDto {
  @IsString()
  @MinLength(3)
  reason: string;
}
