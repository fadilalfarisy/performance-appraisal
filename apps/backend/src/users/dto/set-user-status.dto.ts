import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import type { SetUserStatusRequest } from '@appraisal/types';

export class SetUserStatusDto implements SetUserStatusRequest {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive!: boolean;
}
