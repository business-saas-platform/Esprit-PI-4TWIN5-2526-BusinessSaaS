import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import {
  PaymentMethod,
  SelectedPlan,
} from "../enums/registration-request.enums";

export class CreateRegistrationRequestDto {
  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  companyCategory!: string;

  @IsOptional()
  @IsString()
  companyPhone?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsString()
  companyTaxId?: string;

  @IsOptional()
  @IsString()
  teamSize?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(SelectedPlan)
  selectedPlan?: SelectedPlan;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}