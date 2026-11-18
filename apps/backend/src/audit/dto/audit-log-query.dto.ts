import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import type { AuditLogQuery } from '@appraisal/types';
import { QueryDto } from '../../common/query/query.dto';

export class AuditLogQueryDto extends QueryDto implements AuditLogQuery {
  @ApiPropertyOptional({
    description: 'Inclusive lower bound on occurred_at (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  occurredFrom?: string;

  @ApiPropertyOptional({
    description: 'Inclusive upper bound on occurred_at (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  occurredTo?: string;
}
