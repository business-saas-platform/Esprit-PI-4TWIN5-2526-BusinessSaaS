import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaymentStatus } from "../enums/registration-request.enums";

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}