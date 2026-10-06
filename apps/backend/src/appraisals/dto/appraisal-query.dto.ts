import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AppraisalStatus } from '@appraisal/types';
import { QueryDto } from '../../common/query/query.dto';

export class AppraisalQueryDto extends QueryDto {
  @ApiPropertyOptional({ enum: AppraisalStatus })
  @IsOptional()
  @IsEnum(AppraisalStatus)
  status?: AppraisalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodTo?: string;
}
