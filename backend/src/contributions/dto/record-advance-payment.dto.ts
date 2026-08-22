import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecordAdvancePaymentDto {
  @IsString()
  memberId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  months: number;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
