
import { IsString, IsNotEmpty } from 'class-validator';
 export class ChangePasswordDto {
   @IsString() 
   currentPassword!: string;

   @IsString() @IsNotEmpty()
   newPassword!: string;
 }
