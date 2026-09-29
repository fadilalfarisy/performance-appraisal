import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ example: 'CEO' })
  @IsNotEmpty()
  @IsString()
  name!: string;
}
