import { IsOptional, IsString } from "class-validator";

export class CreateMockPaymentDto {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}