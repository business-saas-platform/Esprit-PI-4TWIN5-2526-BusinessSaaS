import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSupportMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsString()
  status?: "open" | "in_progress" | "resolved" | "closed";

  @IsOptional()
  @IsString()
  title?: string;
}

export class AdminReplyDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  status?: "open" | "in_progress" | "resolved" | "closed";
}
