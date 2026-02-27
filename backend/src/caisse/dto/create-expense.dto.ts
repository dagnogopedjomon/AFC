import { IsNotEmpty, IsString, IsNumber, Min, IsDateString, IsOptional } from 'class-validator';

export class CreateExpenseDto {
  @IsNumber()
  @Min(0.01, { message: 'Le montant doit être strictement positif' })
  amount: number;

  @IsNotEmpty({ message: 'La description est requise' })
  @IsString()
  description: string;

  @IsNotEmpty({ message: 'La date de la dépense est requise' })
  @IsDateString()
  expenseDate: string;

  /** Sous-caisse à débiter (optionnel = caisse par défaut). */
  @IsOptional()
  @IsString()
  cashBoxId?: string;

  /** Bénéficiaire du décaissement (ex. personne, activité, collecte) — pour transparence. */
  @IsOptional()
  @IsString()
  beneficiary?: string;
}
