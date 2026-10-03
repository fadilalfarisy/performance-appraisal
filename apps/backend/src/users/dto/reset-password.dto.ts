import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { ResetPasswordRequest } from '@appraisal/types';

export class ResetPasswordDto implements ResetPasswordRequest {
  @ApiProperty({ example: 'newsecurepassword', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
