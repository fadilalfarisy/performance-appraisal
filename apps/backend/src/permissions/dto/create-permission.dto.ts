import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: "Create User" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "This permission is for creating users" })
  @IsString()
  @IsOptional()
  description?: string;
}
