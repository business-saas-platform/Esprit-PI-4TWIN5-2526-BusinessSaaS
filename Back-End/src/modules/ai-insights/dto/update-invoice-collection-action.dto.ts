import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateInvoiceCollectionActionDto {
  @IsIn(['pending', 'snoozed', 'done'])
  status!: 'pending' | 'snoozed' | 'done';

  @IsOptional()
  @IsString()
  snoozedUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  outcomeNote?: string;

  @IsOptional()
  @IsNumber()
  outcomeAmountCollected?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nextStep?: string;
}
