import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AppraisalStatus } from '@appraisal/types';
import type { AppraisalTransitionRequest } from '@appraisal/types';

export class AppraisalTransitionDto implements AppraisalTransitionRequest {
  @ApiProperty({ enum: AppraisalStatus })
  @IsEnum(AppraisalStatus)
  to!: AppraisalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
