import { IsString, MinLength, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { randomUUID } from 'crypto';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'user-new' })
  @IsString()
  username!: string;

  @ApiPropertyOptional({ example: 'newsecurepassword', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: randomUUID() })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ example: randomUUID() })
  @IsUUID()
  employeeId!: string;
}
