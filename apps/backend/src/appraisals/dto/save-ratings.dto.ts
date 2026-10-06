import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import type { SaveRatingsRequest } from '@appraisal/types';

export class AppraisalRatingDto {
  @ApiPropertyOptional()
  @IsUUID()
  appraisalEmployeeId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  criterionId!: string;

  @IsInt()
  @Min(0)
  rating!: number;
}

export class AppraisalCommentDto {
  @IsUUID()
  appraisalEmployeeId!: string;

  @IsString()
  comment!: string;
}

export class SaveRatingsDto implements SaveRatingsRequest {
  @ApiPropertyOptional({ type: [AppraisalRatingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppraisalRatingDto)
  ratings!: AppraisalRatingDto[];

  @ApiPropertyOptional({ type: [AppraisalCommentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppraisalCommentDto)
  comments?: AppraisalCommentDto[];
}
