import { IsString, MinLength, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { UserRole } from '../enums/user-role.enum';
import type { CreateUserRequest } from '@appraisal/types';

export class CreateUserDto implements CreateUserRequest {
  @ApiPropertyOptional({ example: 'user-new' })
  @IsString()
  username!: string;

  @ApiPropertyOptional({ example: 'newsecurepassword', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.SUPERVISOR })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ example: randomUUID() })
  @IsUUID()
  employeeId!: string;
}
