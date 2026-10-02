import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { CreatePositionRequest } from '@appraisal/types';

export class CreatePositionDto implements CreatePositionRequest {
  @ApiProperty({ example: 'CEO' })
  @IsNotEmpty()
  @IsString()
  name!: string;
}
