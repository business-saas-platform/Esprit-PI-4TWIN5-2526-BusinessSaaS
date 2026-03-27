import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from "class-validator";
import { ClientStatus, ClientType } from "../../../common/enums";

export class CreateClientDto {
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  name!: string;

  @IsEmail()
  @Length(5, 150)
  email!: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  @Matches(/^[+0-9()\-\s]*$/, {
    message: "phone format is invalid",
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 180)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  taxId?: string;

  @IsEnum(["individual", "company"])
  type!: ClientType;

  @IsOptional()
  @IsEnum(["active", "inactive"])
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  lastContactDate?: string;
}