import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Maintainer' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'This role is for maintainers' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissions!: string[];
}
