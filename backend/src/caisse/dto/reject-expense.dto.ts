import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RejectExpenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Le motif ne doit pas dépasser 500 caractères' })
  motif?: string;
}
