import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { PaginationQuery } from '@appraisal/types';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

export class QueryDto implements PaginationQuery {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({ example: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderBy: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
