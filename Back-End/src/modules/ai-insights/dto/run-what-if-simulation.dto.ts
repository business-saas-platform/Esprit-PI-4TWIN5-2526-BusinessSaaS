import { IsIn, IsNumber, IsOptional } from 'class-validator';

export class RunWhatIfSimulationDto {
  @IsOptional()
  @IsIn([30, 60, 90])
  horizon?: 30 | 60 | 90;

  @IsOptional()
  @IsNumber()
  collectionAccelerationPct?: number;

  @IsOptional()
  @IsNumber()
  collectionDelayPct?: number;

  @IsOptional()
  @IsNumber()
  expenseReductionPct?: number;

  @IsOptional()
  @IsNumber()
  expenseIncreasePct?: number;
}
