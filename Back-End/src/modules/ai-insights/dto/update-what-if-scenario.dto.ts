import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWhatIfScenarioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsIn([30, 60, 90])
  horizon!: 30 | 60 | 90;

  @IsNumber()
  collectionAccelerationPct!: number;

  @IsNumber()
  collectionDelayPct!: number;

  @IsNumber()
  expenseReductionPct!: number;

  @IsNumber()
  expenseIncreasePct!: number;
}
