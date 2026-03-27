import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from "class-validator";

export class CreateBusinessDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  taxId!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsNotEmpty()
  fiscalYearStart!: string;

  @IsString()
  @IsNotEmpty()
  industry!: string;

  @IsNumber()
  taxRate!: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsDateString()
  subscriptionStartDate?: string;

  @IsOptional()
  @IsDateString()
  subscriptionEndDate?: string;
}