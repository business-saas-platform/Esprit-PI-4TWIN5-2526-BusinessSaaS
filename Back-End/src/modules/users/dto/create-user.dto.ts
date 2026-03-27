import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn([
    "platform_admin",
    "business_owner",
    "business_admin",
    "accountant",
    "team_member",
    "client",
  ])
  role!: any;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}